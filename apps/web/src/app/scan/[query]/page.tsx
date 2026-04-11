import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AveApiError,
  AveConfigurationError,
  createAveDataClient,
  isBscAddress,
} from "@meme-affinity/core";

export const dynamic = "force-dynamic";

const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";
const DEFAULT_PROBE_TIMEOUT_MS = 6_000;

type ScanPageProps = {
  params: Promise<{
    query: string;
  }>;
};

type ProbeResult = "token" | "not_token" | "uncertain";

function normalizeProbeTimeoutMs(value: string | undefined): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROBE_TIMEOUT_MS;
  }

  return Math.min(parsed, DEFAULT_PROBE_TIMEOUT_MS);
}

function createProbeClient() {
  return createAveDataClient({
    apiKey: process.env.AVE_API_KEY || "",
    baseUrl: process.env.AVE_DATA_BASE_URL || DEFAULT_AVE_BASE_URL,
    timeoutMs: normalizeProbeTimeoutMs(process.env.AVE_REQUEST_TIMEOUT_MS),
  });
}

async function probeTokenAddress(query: string): Promise<ProbeResult> {
  try {
    const client = createProbeClient();
    await client.fetchTokenBrief({
      chain: "bsc",
      tokenAddress: query,
    });
    return "token";
  } catch (error) {
    if (error instanceof AveApiError) {
      return error.statusCode === 404 ? "not_token" : "uncertain";
    }

    if (error instanceof AveConfigurationError) {
      return "uncertain";
    }

    return "uncertain";
  }
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { query } = await params;
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    redirect("/");
  }

  const encodedQuery = encodeURIComponent(normalizedQuery);

  if (!isBscAddress(normalizedQuery)) {
    redirect(`/address/${encodedQuery}`);
  }

  const probeResult = await probeTokenAddress(normalizedQuery);

  if (probeResult === "token") {
    redirect(`/token/${encodedQuery}`);
  }

  if (probeResult === "not_token") {
    redirect(`/address/${encodedQuery}`);
  }

  return (
    <main className="relative mx-auto flex w-full max-w-4xl flex-1 items-center px-6 py-12 md:px-10">
      <section className="surface-card-strong w-full px-6 py-12 text-center md:px-10">
        <p className="break-all font-mono text-sm text-[var(--color-ink-soft)]">
          {normalizedQuery}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/token/${encodedQuery}`}
            className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-6 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5"
          >
            按代币查
          </Link>
          <Link
            href={`/address/${encodedQuery}`}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
          >
            按地址查
          </Link>
        </div>
      </section>
    </main>
  );
}
