import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MoreHorizontal, Search, UserPlus, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  current_plan?: {
    name: string;
  } | null;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  user_metadata: {
    name?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  status: string;
  current_plan: {
    name: string;
  } | null;
  questions_generated?: number;
  papers_graded?: number;
  last_login?: string;
  banned_until?: string;
}

interface UserDetailsProps {
  user: User;
  onClose: () => void;
}

function UserDetailsDialog({ user, onClose }: UserDetailsProps) {
  const { data: usage } = useQuery({
    queryKey: ["admin", "user-usage", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data;
    },
  });

  const downloadUsageSummary = () => {
    if (!usage) return;

    const csvContent = [
      ["Date", "Action", "Details"].join(","),
      ...usage.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.action,
        JSON.stringify(log.details),
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-summary-${user.email}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>User Details - {user.email}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium">Questions Generated</dt>
                  <dd className="text-2xl font-bold">
                    {user.questions_generated}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Papers Graded</dt>
                  <dd className="text-2xl font-bold">{user.papers_graded}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Last Login</dt>
                  <dd className="text-sm">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : "Never"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium">Current Plan</dt>
                  <dd className="text-sm">
                    {user.current_plan?.name || "No Plan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Status</dt>
                  <dd className="text-sm">{user.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Joined</dt>
                  <dd className="text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 100 actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        {JSON.stringify(log.details, null, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button onClick={downloadUsageSummary}>
            <Download className="mr-2 h-4 w-4" />
            Download Usage Summary
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </DialogContent>
  );
}

const FREE_PLAN = { name: 'Free' };

export function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch users from backend API instead of Supabase admin client
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const { users } = await res.json();
      return users;
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update the toggle user status mutation to use admin client
  const toggleUserStatus = useMutation({
    mutationFn: async ({
      userId,
      action,
    }: {
      userId: string;
      action: "DISABLE" | "ENABLE";
    }) => {
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { ban_duration: action === 'DISABLE' ? 'none' : undefined }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update user status");
      console.error("Error updating user status:", error);
    },
  });

  const exportUsers = () => {
    const csvData = filteredUsers.map(user => ({
      ID: user.id,
      Email: user.email,
      Name: user.user_metadata?.name || '',
      'Sign Up Date': formatDate(user.created_at),
      'Last Login': user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never',
      Provider: user.app_metadata?.provider || 'email',
      Plan: user.current_plan?.name || 'No Plan',
      Status: user.status
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${formatDate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage your application users and their access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportUsers}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Sign Up Date</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.user_metadata?.name || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.app_metadata?.provider || 'email'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.banned_until ? 'destructive' : 'default'}
                        >
                          {user.banned_until ? 'DISABLED' : 'ACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                toggleUserStatus.mutate({
                                  userId: user.id,
                                  action: user.banned_until ? 'ENABLE' : 'DISABLE',
                                });
                              }}
                            >
                              {user.banned_until ? 'Enable' : 'Disable'} User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSelectedUser(user)}
                            >
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>User ID</Label>
                <div className="text-sm text-muted-foreground font-mono">
                  {selectedUser.id}
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.user_metadata?.name || 'Not set'}
                </div>
              </div>
              <div>
                <Label>Created At</Label>
                <div className="text-sm text-muted-foreground">
                  {formatDate(selectedUser.created_at)}
                </div>
              </div>
              <div>
                <Label>Last Sign In</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.last_sign_in_at 
                    ? formatDate(selectedUser.last_sign_in_at) 
                    : 'Never'}
                </div>
              </div>
              <div>
                <Label>Authentication Provider</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.app_metadata?.provider || 'email'}
                </div>
              </div>
              <div>
                <Label>Current Plan</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedUser.current_plan?.name || 'No Plan'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 