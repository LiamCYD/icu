import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code } from "lucide-react";

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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Code className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">API Documentation</h1>
          <p className="text-sm text-muted-foreground">
            {API_ENDPOINTS.length} REST endpoints for threat intelligence data
          </p>
        </div>
      </div>

      <Card className="glass-card border-border/50">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            All endpoints return JSON responses. Pagination is included where
            applicable. Rate limit: 100 requests/minute/IP.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Base URL:{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              https://icu.example.com
            </code>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {API_ENDPOINTS.map((endpoint) => (
          <Card
            key={endpoint.path}
            className="glass-card border-border/50 overflow-hidden"
          >
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="flex items-center gap-3">
                <Badge
                  className="bg-green-500/10 text-green-400 border-green-500/20 font-mono text-xs"
                  variant="outline"
                >
                  {endpoint.method}
                </Badge>
                <code className="text-sm">{endpoint.path}</code>
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {endpoint.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {endpoint.params.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Parameters
                  </h4>
                  <div className="space-y-2">
                    {endpoint.params.map((param) => (
                      <div
                        key={param.name}
                        className="flex items-start gap-3 text-sm"
                      >
                        <code className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs">
                          {param.name}
                        </code>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs"
                        >
                          {param.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {param.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Example
                </h4>
                <pre className="overflow-x-auto rounded-md bg-black/40 border border-border/50 p-3 text-xs">
                  <code className="text-green-400">{endpoint.example}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
