export interface ParsedExpense {
  amount: number;
  category:
    | "Food"
    | "Transport"
    | "Shopping"
    | "Bills"
    | "Entertainment"
    | "Other";
  description: string;
  date: string; // YYYY-MM-DD
}
