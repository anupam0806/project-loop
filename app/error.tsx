"use client";
import { AppError } from "@/utils/AppError";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const status = (error as any).statusCode || 500;
  const message = error.message || "An unexpected error occurred";
  return (
    <html>
      <body className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error {status}</h1>
        <p>{message}</p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 bg-gray-100 p-2 rounded">{error.stack}</pre>
        )}
      </body>
    </html>
  );
}
