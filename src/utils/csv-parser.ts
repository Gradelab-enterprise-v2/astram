
/**
 * Parses CSV file content and returns an array of objects
 * @param content CSV file content as string
 * @param headers If true, assumes the first row contains column headers
 * @returns Array of objects with keys from headers and values from rows
 */
export function parseCSV(content: string, headers = true): Record<string, string>[] {
  const lines = content.split("\n").filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return [];
  }
  
  // Extract headers from first line or generate default headers
  const headerRow = lines[0].split(",").map(h => h.trim());
  const columnHeaders = headers ? headerRow : headerRow.map((_, i) => `column${i + 1}`);
  
  // Start from index 1 if headers are included, otherwise from index 0
  const startIndex = headers ? 1 : 0;
  
  return lines.slice(startIndex).map(line => {
    const values = line.split(",").map(v => v.trim());
    const record: Record<string, string> = {};
    
    columnHeaders.forEach((header, index) => {
      record[header] = values[index] || "";
    });
    
    return record;
  });
}

/**
 * Generates a sample CSV string for student data
 */
export function generateStudentCSVTemplate(): string {
  return "name,gr_number,roll_number,year,email,phone,gender,date_of_birth,class_id,address\nJohn Doe,GR12345,101,2023,john@example.com,1234567890,Male,2000-01-01,,123 Main St\nJane Smith,GR12346,102,2023,jane@example.com,9876543210,Female,2001-02-15,,456 Oak Ave";
}

/**
 * Validates a parsed CSV for student data
 * @param data Parsed CSV data
 * @returns Object containing validation result and any errors
 */
export function validateStudentCSV(data: Record<string, string>[]): { 
  valid: boolean;
  errors: string[]; 
} {
  const requiredFields = ["name", "gr_number", "roll_number", "year", "email", "phone", "gender", "date_of_birth"];
  const errors: string[] = [];
  
  if (data.length === 0) {
    return { valid: false, errors: ["CSV file is empty"] };
  }
  
  // Check if all required fields are present in the headers
  const firstRow = data[0];
  const missingHeaders = requiredFields.filter(field => !(field in firstRow));
  
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(", ")}`);
  }
  
  // Validate each row
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field]) {
        errors.push(`Row ${index + 1}: Missing value for ${field}`);
      }
    });
    
    // Validate email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }
    
    // Validate date format (YYYY-MM-DD)
    if (row.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
      errors.push(`Row ${index + 1}: Date of birth must be in YYYY-MM-DD format`);
    }
    
    // Validate gender values
    if (row.gender && !["Male", "Female", "Other"].includes(row.gender)) {
      errors.push(`Row ${index + 1}: Gender must be one of: Male, Female, Other`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
