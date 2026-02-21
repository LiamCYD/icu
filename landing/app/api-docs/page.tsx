import { Badge } from "@/components/ui/badge";

const API_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/threats",
    description: "List all threats with pagination and filtering",
    params: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "limit", type: "number", description: "Items per page (default: 20, max: 100)" },
      { name: "risk", type: "string", description: "Filter by risk level: critical, high, medium, low" },
      { name: "category", type: "string", description: "Filter by category: prompt_injection, data_exfiltration, obfuscation, suspicious_commands, network_suspicious" },
      { name: "marketplace", type: "string", description: "Filter by marketplace name" },
      { name: "q", type: "string", description: "Search packages by name or description" },
      { name: "sort", type: "string", description: "Sort by: firstSeen, lastScanned, name, riskLevel" },
      { name: "order", type: "string", description: "Sort order: asc or desc" },
    ],
    example: "curl 'https://icu.example.com/api/threats?risk=critical&limit=5'",
  },
  {
    method: "GET",
    path: "/api/threats/:id",
    description: "Get full threat report including scan history and findings",
    params: [],
    example: "curl 'https://icu.example.com/api/threats/clx123abc'",
  },
  {
    method: "GET",
    path: "/api/authors",
    description: "List all authors with pagination",
    params: [
      { name: "page", type: "number", description: "Page number (default: 1)" },
      { name: "limit", type: "number", description: "Items per page (default: 20, max: 100)" },
      { name: "q", type: "string", description: "Search authors by name" },
      { name: "sort", type: "string", description: "Sort by: lastSeen, firstSeen, name" },
    ],
    example: "curl 'https://icu.example.com/api/authors?limit=10'",
  },
  {
    method: "GET",
    path: "/api/authors/:id",
    description: "Get author profile with their packages",
    params: [],
    example: "curl 'https://icu.example.com/api/authors/clx456def'",
  },
  {
    method: "GET",
    path: "/api/stats",
    description: "Get dashboard aggregate statistics and marketplace data",
    params: [],
    example: "curl 'https://icu.example.com/api/stats'",
  },
  {
    method: "GET",
    path: "/api/search",
    description: "Cross-entity search across packages and authors",
    params: [
      { name: "q", type: "string", description: "Search query (min 2 characters)" },
      { name: "type", type: "string", description: "Scope: packages, authors, or all (default)" },
      { name: "limit", type: "number", description: "Max results per type (default: 10, max: 50)" },
    ],
    example: "curl 'https://icu.example.com/api/search?q=claude&type=packages'",
  },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-12 md:px-20">
      <div>
        <h1 className="display-heading text-3xl">API Documentation</h1>
        <p className="light-text mt-1 text-lg opacity-55">
          {API_ENDPOINTS.length} REST endpoints for threat intelligence data
        </p>
      </div>

      <div className="rounded-[22px] border border-border p-6">
        <p className="text-sm text-white/55">
          All endpoints return JSON responses. Pagination is included where
          applicable. Rate limit: 100 requests/minute/IP.
        </p>
        <p className="mt-2 text-sm text-white/55">
          Base URL:{" "}
          <code className="rounded bg-border/30 px-1.5 py-0.5 text-xs text-white">
            https://icu.example.com
          </code>
        </p>
      </div>

      <div className="space-y-6">
        {API_ENDPOINTS.map((endpoint) => (
          <div
            key={endpoint.path}
            className="overflow-hidden rounded-[22px] border border-border"
          >
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <Badge
                  className="bg-[#3a8a8c]/10 text-[#3a8a8c] border-[#3a8a8c]/20 font-mono text-xs"
                  variant="outline"
                >
                  {endpoint.method}
                </Badge>
                <code className="text-sm">{endpoint.path}</code>
              </div>
              <p className="mt-1 text-sm text-white/55">
                {endpoint.description}
              </p>
            </div>
            <div className="space-y-4 p-4">
              {endpoint.params.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase text-white/50">
                    Parameters
                  </h4>
                  <div className="space-y-2">
                    {endpoint.params.map((param) => (
                      <div
                        key={param.name}
                        className="flex items-start gap-3 text-sm"
                      >
                        <code className="shrink-0 rounded bg-border/30 px-1.5 py-0.5 text-xs text-white">
                          {param.name}
                        </code>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs"
                        >
                          {param.type}
                        </Badge>
                        <span className="text-white/55">
                          {param.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-white/50">
                  Example
                </h4>
                <pre className="overflow-x-auto rounded-md bg-[#0d1b20] border border-border p-3 text-xs">
                  <code className="text-[#3a8a8c]">{endpoint.example}</code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
