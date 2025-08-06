export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      add_on_purchases: {
        Row: {
          add_on_type: string
          created_at: string
          currency: string | null
          id: string
          is_recurring: boolean | null
          is_template: boolean | null
          next_billing_date: string | null
          payment_id: string | null
          quantity: number | null
          status: string | null
          unit_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          add_on_type: string
          created_at?: string
          currency?: string | null
          id?: string
          is_recurring?: boolean | null
          is_template?: boolean | null
          next_billing_date?: string | null
          payment_id?: string | null
          quantity?: number | null
          status?: string | null
          unit_price: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          add_on_type?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_recurring?: boolean | null
          is_template?: boolean | null
          next_billing_date?: string | null
          payment_id?: string | null
          quantity?: number | null
          status?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      administrators: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_history: {
        Row: {
          bloomsdata: Json | null
          created_at: string
          extraction_completed_at: string | null
          extraction_started_at: string | null
          extraction_status: string | null
          file_url: string | null
          has_extracted_text: boolean | null
          id: string
          questions: Json | null
          status: string
          subject_id: string | null
          text_content: string | null
          title: string
          user_id: string
        }
        Insert: {
          bloomsdata?: Json | null
          created_at?: string
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extraction_status?: string | null
          file_url?: string | null
          has_extracted_text?: boolean | null
          id?: string
          questions?: Json | null
          status?: string
          subject_id?: string | null
          text_content?: string | null
          title: string
          user_id: string
        }
        Update: {
          bloomsdata?: Json | null
          created_at?: string
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extraction_status?: string | null
          file_url?: string | null
          has_extracted_text?: boolean | null
          id?: string
          questions?: Json | null
          status?: string
          subject_id?: string | null
          text_content?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_history_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_id: string
          created_at: string
          id: string
          status: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_id: string
          created_at?: string
          id?: string
          status?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_id?: string
          created_at?: string
          id?: string
          status?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_grade_status: {
        Row: {
          answer_sheet_id: string | null
          created_at: string
          evaluation_result: Json | null
          feedback: string | null
          id: string
          score: number | null
          status: string
          student_id: string
          test_id: string
          updated_at: string
          user_feedback: Json | null
        }
        Insert: {
          answer_sheet_id?: string | null
          created_at?: string
          evaluation_result?: Json | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id: string
          test_id: string
          updated_at?: string
          user_feedback?: Json | null
        }
        Update: {
          answer_sheet_id?: string | null
          created_at?: string
          evaluation_result?: Json | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string
          student_id?: string
          test_id?: string
          updated_at?: string
          user_feedback?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_grade_status_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_grade_status_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_materials: {
        Row: {
          created_at: string
          extraction_completed_at: string | null
          extraction_started_at: string | null
          extraction_status: string
          file_url: string
          has_extracted_text: boolean
          id: string
          subject_id: string
          text_content: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extraction_status?: string
          file_url: string
          has_extracted_text?: boolean
          id?: string
          subject_id: string
          text_content?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extraction_status?: string
          file_url?: string
          has_extracted_text?: boolean
          id?: string
          subject_id?: string
          text_content?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          department: string | null
          grade: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          grade?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          created_at?: string
          department?: string | null
          grade?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: []
      }
      course_outcomes: {
        Row: {
          created_at: string
          description: string
          id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_outcomes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_requests: {
        Row: {
          created_at: string
          credit_amount: number
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_amount: number
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_amount?: number
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_usage_logs: {
        Row: {
          action_type: string
          created_at: string
          credits_used: number
          description: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_used: number
          description: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_used?: number
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      currency_pricing: {
        Row: {
          annual_price: number
          created_at: string
          currency_code: string
          id: string
          monthly_price: number
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          annual_price: number
          created_at?: string
          currency_code: string
          id?: string
          monthly_price: number
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          currency_code?: string
          id?: string
          monthly_price?: number
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_papers: {
        Row: {
          bloomsdata: Json | null
          content_reference: string | null
          created_at: string
          difficulty: number
          id: string
          question_count: number
          question_mode: string
          subject_id: string
          title: string
          user_id: string
        }
        Insert: {
          bloomsdata?: Json | null
          content_reference?: string | null
          created_at?: string
          difficulty: number
          id?: string
          question_count: number
          question_mode: string
          subject_id: string
          title: string
          user_id: string
        }
        Update: {
          bloomsdata?: Json | null
          content_reference?: string | null
          created_at?: string
          difficulty?: number
          id?: string
          question_count?: number
          question_mode?: string
          subject_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_questions: {
        Row: {
          answer_text: string | null
          bloom_level: string | null
          course_outcome_id: string | null
          created_at: string
          difficulty: number | null
          id: string
          marks: number | null
          options: Json | null
          paper_id: string | null
          question_text: string
          question_type: string
          subject_id: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          bloom_level?: string | null
          course_outcome_id?: string | null
          created_at?: string
          difficulty?: number | null
          id?: string
          marks?: number | null
          options?: Json | null
          paper_id?: string | null
          question_text: string
          question_type: string
          subject_id: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string | null
          bloom_level?: string | null
          course_outcome_id?: string | null
          created_at?: string
          difficulty?: number | null
          id?: string
          marks?: number | null
          options?: Json | null
          paper_id?: string | null
          question_text?: string
          question_type?: string
          subject_id?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_questions_course_outcome_id_fkey"
            columns: ["course_outcome_id"]
            isOneToOne: false
            referencedRelation: "course_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "generated_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string
          file_path: string
          id: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          allows_rollover: boolean
          annual_price: number
          created_at: string | null
          credit_amount: number
          description: string | null
          features: string[]
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          student_limit: number
          test_limit: number
          updated_at: string | null
        }
        Insert: {
          allows_rollover?: boolean
          annual_price: number
          created_at?: string | null
          credit_amount?: number
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean | null
          monthly_price: number
          name: string
          student_limit: number
          test_limit: number
          updated_at?: string | null
        }
        Update: {
          allows_rollover?: boolean
          annual_price?: number
          created_at?: string | null
          credit_amount?: number
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          student_limit?: number
          test_limit?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      question_view_preferences: {
        Row: {
          created_at: string
          id: string
          question_index: number
          student_id: string
          test_id: string
          updated_at: string
          user_id: string
          view_mode: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_index: number
          student_id: string
          test_id: string
          updated_at?: string
          user_id: string
          view_mode?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_index?: number
          student_id?: string
          test_id?: string
          updated_at?: string
          user_id?: string
          view_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_view_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answer_sheets: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_url: string
          has_extracted_text: boolean
          id: string
          status: string
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_url: string
          has_extracted_text?: boolean
          id?: string
          status?: string
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_url?: string
          has_extracted_text?: boolean
          id?: string
          status?: string
          student_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answer_sheets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answer_sheets_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string | null
          gender: string | null
          gr_number: string
          id: string
          name: string
          notes: string | null
          parent_contact: string | null
          parent_name: string | null
          phone: string | null
          profile_picture: string | null
          roll_number: string
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          gender?: string | null
          gr_number: string
          id?: string
          name: string
          notes?: string | null
          parent_contact?: string | null
          parent_name?: string | null
          phone?: string | null
          profile_picture?: string | null
          roll_number: string
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          gender?: string | null
          gr_number?: string
          id?: string
          name?: string
          notes?: string | null
          parent_contact?: string | null
          parent_name?: string | null
          phone?: string | null
          profile_picture?: string | null
          roll_number?: string
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_enrollments: {
        Row: {
          created_at: string
          id: string
          student_id: string | null
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id?: string | null
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string | null
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class: string
          code: string
          created_at: string
          id: string
          information: string | null
          name: string
          semester: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class: string
          code: string
          created_at?: string
          id?: string
          information?: string | null
          name: string
          semester?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: string
          code?: string
          created_at?: string
          id?: string
          information?: string | null
          name?: string
          semester?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_papers: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_url: string
          has_extracted_text: boolean
          id: string
          last_extracted_at: string | null
          metadata: Json | null
          paper_type: string
          subject_id: string | null
          test_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_url: string
          has_extracted_text?: boolean
          id?: string
          last_extracted_at?: string | null
          metadata?: Json | null
          paper_type: string
          subject_id?: string | null
          test_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_url?: string
          has_extracted_text?: boolean
          id?: string
          last_extracted_at?: string | null
          metadata?: Json | null
          paper_type?: string
          subject_id?: string | null
          test_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_papers_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          id: string
          marks_obtained: number
          student_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks_obtained: number
          student_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marks_obtained?: number
          student_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          max_marks: number
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          max_marks: number
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          max_marks?: number
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_requests: {
        Row: {
          created_at: string | null
          id: string
          is_annual: boolean | null
          requested_plan_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_annual?: boolean | null
          requested_plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_annual?: boolean | null
          requested_plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          created_at: string | null
          id: string
          month: number
          students_graded: number | null
          tests_generated: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          students_graded?: number | null
          tests_generated?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          students_graded?: number | null
          tests_generated?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string | null
          id: string
          is_annual: boolean | null
          last_payment_attempt: string | null
          monthly_usage_reset_day: number
          payment_retry_count: number | null
          payment_status: string | null
          plan_id: string | null
          remaining_credits: number
          renewal_date: string
          subscription_id: string | null
          total_credits: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_annual?: boolean | null
          last_payment_attempt?: string | null
          monthly_usage_reset_day: number
          payment_retry_count?: number | null
          payment_status?: string | null
          plan_id?: string | null
          remaining_credits?: number
          renewal_date: string
          subscription_id?: string | null
          total_credits?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_annual?: boolean | null
          last_payment_attempt?: string | null
          monthly_usage_reset_day?: number
          payment_retry_count?: number | null
          payment_status?: string | null
          plan_id?: string | null
          remaining_credits?: number
          renewal_date?: string
          subscription_id?: string | null
          total_credits?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: { uid: string; credits_to_add: number }
        Returns: boolean
      }
      can_generate_test: {
        Args: { uid: string }
        Returns: boolean
      }
      get_user_current_usage: {
        Args: { uid: string }
        Returns: {
          students_graded: number
          tests_generated: number
        }[]
      }
      get_user_plan: {
        Args: { uid: string }
        Returns: {
          plan_id: string
          plan_name: string
          monthly_price: number
          annual_price: number
          student_limit: number
          test_limit: number
          is_annual: boolean
          renewal_date: string
        }[]
      }
      get_user_plan_with_credits: {
        Args: { uid: string }
        Returns: {
          plan_id: string
          plan_name: string
          monthly_price: number
          annual_price: number
          student_limit: number
          test_limit: number
          credit_amount: number
          allows_rollover: boolean
          features: string[]
          is_annual: boolean
          renewal_date: string
          total_credits: number
          remaining_credits: number
        }[]
      }
      get_user_role: {
        Args: { uid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      increment_student_grading_usage: {
        Args: { uid: string; count?: number }
        Returns: undefined
      }
      increment_test_generation_usage: {
        Args: { uid: string; count?: number }
        Returns: undefined
      }
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      is_institution_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      use_credits: {
        Args: {
          uid: string
          credits_to_use: number
          action: string
          action_description: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "teacher" | "institution_admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["teacher", "institution_admin", "super_admin"],
    },
  },
} as const
