import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Create a new QueryClient instance for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("Social IQ Frontend Page Render Verification Suite", () => {
  it("should render the Login page correctly", () => {
    renderWithProviders(<Login />);
    
    // Check for login forms and buttons
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in to dashboard/i })).toBeDefined();
  });

  it("should render the Register page correctly", () => {
    renderWithProviders(<Register />);
    
    // Check for registration headers and form fields
    expect(screen.getByPlaceholderText(/pewdiepie, elon musk/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /register social dashboard/i })).toBeDefined();
  });
});
