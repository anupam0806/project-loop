import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/authOptions';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Authenticated users are sent to the dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // Unauthenticated visitors see the public landing page
  return (
    <main className="bg-background min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-primary">Project LOOP</h1>
          <p className="text-xl text-secondary">AI-powered Voice of Customer intelligence</p>
          <p className="text-base text-primary max-w-2xl mx-auto">
            Unlock actionable insights from every customer interaction across channels. LOOP aggregates feedback, classifies themes with AI, and delivers clear reports.
          </p>
        </header>

        {/* Features */}
        <section className="grid gap-6 md:grid-cols-2">
          <FeatureCard title="Multi-channel feedback inbox" description="Collect messages, emails, chats and surveys in one unified view." />
          <FeatureCard title="AI classification & themes" description="Automatically tag sentiment, topics and trends using large language models." />
          <FeatureCard title="Ask LOOP" description="Grounded Q&A over your data with source citations for every answer." />
          <FeatureCard title="Voice of Customer reports" description="Export polished, data‑driven reports for stakeholders." />
        </section>

        {/* Calls to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-accent text-accent rounded-md hover:bg-accent-soft transition-colors"
          >
            Create workspace
          </Link>
        </div>

        {/* Demo credentials */}
        <p className="text-sm text-secondary text-center">
          Demo: admin@example.com / password123
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-surface p-6 rounded-md shadow-card border border-border">
      <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
      <p className="text-sm text-secondary">{description}</p>
    </div>
  );
}
