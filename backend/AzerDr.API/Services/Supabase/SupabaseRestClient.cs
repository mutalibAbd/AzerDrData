using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AzerDr.API.Services.Supabase;

/// <summary>
/// HTTP client wrapper for Supabase PostgREST API.
/// Handles all database operations via HTTPS REST (works even without direct PostgreSQL/IPv4).
/// </summary>
public class SupabaseRestClient
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly JsonSerializerOptions _jsonOptions;

    public SupabaseRestClient(HttpClient http, IConfiguration config)
    {
        _baseUrl = config["Supabase:Url"]?.TrimEnd('/') ?? throw new ArgumentException("Supabase:Url not configured");
        var apiKey = config["Supabase:ServiceRoleKey"] ?? config["Supabase:AnonKey"]
            ?? throw new ArgumentException("Supabase:ServiceRoleKey or Supabase:AnonKey not configured");

        _http = http;
        _http.DefaultRequestHeaders.Add("apikey", apiKey);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        // NOTE: Do NOT set Prefer as default - it breaks RPC calls. Set per-request instead.

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNameCaseInsensitive = true
        };
    }

    // ── Query (SELECT) ─────────────────────────────────────

    public async Task<List<T>> From<T>(string table, string query = "")
    {
        var url = $"{_baseUrl}/rest/v1/{table}?{query}";
        var response = await _http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<T>>(json, _jsonOptions) ?? [];
    }

    public async Task<T?> FromSingle<T>(string table, string query) where T : class
    {
        var url = $"{_baseUrl}/rest/v1/{table}?{query}&limit=1";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Accept", "application/vnd.pgrst.object+json");
        // Don't copy the default Prefer header for this specific request
        var response = await _http.SendAsync(request);
        if (response.StatusCode == System.Net.HttpStatusCode.NotAcceptable) return null; // No rows
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, _jsonOptions);
    }

    public async Task<long> Count(string table, string filter = "")
    {
        var url = $"{_baseUrl}/rest/v1/{table}?select=*&{filter}";
        using var request = new HttpRequestMessage(HttpMethod.Head, url);
        request.Headers.Add("Prefer", "count=exact");
        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var range = response.Content.Headers.GetValues("Content-Range").FirstOrDefault() ?? "*/0";
        var total = range.Split('/').Last();
        return long.Parse(total);
    }

    // ── Insert ─────────────────────────────────────────────

    public async Task<T?> Insert<T>(string table, object data) where T : class
    {
        var url = $"{_baseUrl}/rest/v1/{table}";
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.Headers.Add("Prefer", "return=representation");
        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var responseJson = await response.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<List<T>>(responseJson, _jsonOptions);
        return list?.FirstOrDefault();
    }

    // ── Update ─────────────────────────────────────────────

    public async Task<int> Update(string table, string filter, object data)
    {
        var url = $"{_baseUrl}/rest/v1/{table}?{filter}";
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Patch, url) { Content = content };
        request.Headers.Add("Prefer", "return=representation");
        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var responseJson = await response.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<List<JsonElement>>(responseJson, _jsonOptions);
        return list?.Count ?? 0;
    }

    // ── Upsert (INSERT ... ON CONFLICT DO UPDATE) ──────────

    /// <summary>
    /// UPSERT a row. <paramref name="conflictColumn"/> is the column used for ON CONFLICT resolution.
    /// Returns the upserted row.
    /// </summary>
    public async Task<T?> Upsert<T>(string table, string conflictColumn, object data) where T : class
    {
        var url = $"{_baseUrl}/rest/v1/{table}?on_conflict={conflictColumn}";
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.Headers.Add("Prefer", "resolution=merge-duplicates,return=representation");
        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var responseJson = await response.Content.ReadAsStringAsync();
        var list = JsonSerializer.Deserialize<List<T>>(responseJson, _jsonOptions);
        return list?.FirstOrDefault();
    }

    // ── RPC (stored procedures) ────────────────────────────

    public async Task<List<T>> Rpc<T>(string functionName, object? parameters = null)
    {
        var url = $"{_baseUrl}/rest/v1/rpc/{functionName}";
        var json = parameters != null
            ? JsonSerializer.Serialize(parameters, _jsonOptions)
            : "{}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _http.PostAsync(url, content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[RPC Error] {functionName}: {(int)response.StatusCode} {errorBody}");
            throw new HttpRequestException($"RPC {functionName} failed: {(int)response.StatusCode} - {errorBody}");
        }
        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<T>>(responseJson, _jsonOptions) ?? [];
    }

    public async Task<T?> RpcSingle<T>(string functionName, object? parameters = null) where T : struct
    {
        var url = $"{_baseUrl}/rest/v1/rpc/{functionName}";
        var json = parameters != null
            ? JsonSerializer.Serialize(parameters, _jsonOptions)
            : "{}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _http.PostAsync(url, content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[RPC Error] {functionName}: {(int)response.StatusCode} {errorBody}");
            throw new HttpRequestException($"RPC {functionName} failed: {(int)response.StatusCode} - {errorBody}");
        }
        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseJson, _jsonOptions);
    }
}
