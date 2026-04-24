using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using AzerDr.API.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace AzerDr.API.Services;

public interface IIcd11Service
{
    Task<List<Icd11SearchResult>> SearchAsync(string query);
    Task<Icd11EntityDetails?>     GetEntityDetailsAsync(string entityId);
}

public class Icd11Service : IIcd11Service
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly ILogger<Icd11Service> _logger;

    private const string TokenCacheKey = "icd11_access_token";

    public Icd11Service(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        IConfiguration config,
        ILogger<Icd11Service> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _config = config;
        _logger = logger;
    }

    private async Task<string> GetAccessTokenAsync()
    {
        if (_cache.TryGetValue(TokenCacheKey, out string? cachedToken) && cachedToken != null)
            return cachedToken;

        var clientId     = _config["Icd11:ClientId"]     ?? throw new InvalidOperationException("Icd11:ClientId not configured");
        var clientSecret = _config["Icd11:ClientSecret"] ?? throw new InvalidOperationException("Icd11:ClientSecret not configured");
        var tokenUrl     = _config["Icd11:TokenUrl"]     ?? "https://icdaccessmanagement.who.int/connect/token";

        var client = _httpClientFactory.CreateClient("icd11_auth");
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "client_credentials",
            ["client_id"]     = clientId,
            ["client_secret"] = clientSecret,
            ["scope"]         = "icdapi_access",
        });

        var response = await client.PostAsync(tokenUrl, body);
        response.EnsureSuccessStatusCode();

        var json  = await response.Content.ReadAsStringAsync();
        var token = JsonDocument.Parse(json).RootElement.GetProperty("access_token").GetString()
                    ?? throw new InvalidOperationException("Could not parse ICD-11 access token");

        // Cache for 55 minutes (tokens expire in ~60 min)
        _cache.Set(TokenCacheKey, token, TimeSpan.FromMinutes(55));
        return token;
    }

    public async Task<List<Icd11SearchResult>> SearchAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return [];

        try
        {
            var token      = await GetAccessTokenAsync();
            var apiBase    = _config["Icd11:ApiBaseUrl"] ?? "https://id.who.int/icd";
            var releaseId  = _config["Icd11:ReleaseId"]  ?? "release/11/2025-01/mms";

            var client = _httpClientFactory.CreateClient("icd11_api");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            client.DefaultRequestHeaders.Add("API-Version", "v2");
            client.DefaultRequestHeaders.Add("Accept-Language", "en");
            client.DefaultRequestHeaders.Add("Accept", "application/json");

            var encodedQuery = Uri.EscapeDataString(query);
            var url = $"{apiBase}/{releaseId}/search?q={encodedQuery}&useFlexisearch=true&flatResults=true";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ICD-11 search returned {Status} for query '{Query}'", response.StatusCode, query);
                return [];
            }

            var json = await response.Content.ReadAsStringAsync();
            var root = JsonDocument.Parse(json).RootElement;

            if (!root.TryGetProperty("destinationEntities", out var entities))
                return [];

            var results = new List<Icd11SearchResult>();
            foreach (var entity in entities.EnumerateArray())
            {
                var rawTitle = entity.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
                var theCode  = entity.TryGetProperty("theCode", out var tc) ? tc.GetString() : null;
                var entityId = entity.TryGetProperty("id", out var id) ? id.GetString() : null;

                // Strip HTML tags (WHO API wraps matches in <em class='found'>...</em>)
                var title = System.Text.RegularExpressions.Regex.Replace(rawTitle, "<[^>]+>", "");

                // Extract entity ID from URL if needed (format: http://id.who.int/icd/entity/XXXXXXX)
                if (entityId != null && entityId.Contains('/'))
                    entityId = entityId.Split('/').Last();

                if (string.IsNullOrEmpty(theCode)) continue; // skip entries without a code

                // matchingPVs non-empty → entity has postcoordination axes available
                var hasPostcoord = entity.TryGetProperty("matchingPVs", out var pvs)
                                   && pvs.ValueKind == JsonValueKind.Array
                                   && pvs.GetArrayLength() > 0;

                results.Add(new Icd11SearchResult(
                    Code: theCode,
                    Title: title,
                    EntityId: entityId,
                    HasPostcoordination: hasPostcoord
                ));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ICD-11 search failed for query '{Query}'", query);
            return [];
        }
    }

    public async Task<Icd11EntityDetails?> GetEntityDetailsAsync(string entityId)
    {
        try
        {
            var token     = await GetAccessTokenAsync();
            var apiBase   = _config["Icd11:ApiBaseUrl"] ?? "https://id.who.int/icd";
            var releaseId = _config["Icd11:ReleaseId"]  ?? "release/11/2025-01/mms";

            var client = _httpClientFactory.CreateClient("icd11_api");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            client.DefaultRequestHeaders.Add("API-Version", "v2");
            client.DefaultRequestHeaders.Add("Accept-Language", "en");
            client.DefaultRequestHeaders.Add("Accept", "application/json");

            // Direct linearization GET — the entityId is the last segment of the MMS URI
            var url = $"{apiBase}/{releaseId}/{entityId}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ICD-11 entity lookup returned {Status} for '{EntityId}'", response.StatusCode, entityId);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var root = JsonDocument.Parse(json).RootElement;

            var title       = GetLangValue(root, "title") ?? entityId;
            var description = GetLangValue(root, "definition");

            var exclusions = new List<string>();
            if (root.TryGetProperty("exclusion", out var excArr))
                foreach (var exc in excArr.EnumerateArray())
                    if (exc.TryGetProperty("label", out var lbl))
                    {
                        var text = lbl.TryGetProperty("@value", out var v) ? v.GetString() : null;
                        if (!string.IsNullOrEmpty(text)) exclusions.Add(text);
                    }

            var codedElsewhere = new List<string>();
            if (root.TryGetProperty("codedElsewhere", out var ceArr))
                foreach (var ce in ceArr.EnumerateArray())
                    if (ce.TryGetProperty("label", out var lbl))
                    {
                        var text = lbl.TryGetProperty("@value", out var v) ? v.GetString() : null;
                        if (!string.IsNullOrEmpty(text)) codedElsewhere.Add(text);
                    }

            // Parse postcoordinationScale for required/optional axes
            var requiredAxes = new List<PostcoordAxis>();
            var optionalAxes = new List<PostcoordAxis>();
            if (root.TryGetProperty("postcoordinationScale", out var scaleArr))
            {
                foreach (var axis in scaleArr.EnumerateArray())
                {
                    var axisUri  = axis.TryGetProperty("axisName", out var an) ? an.GetString() ?? "" : "";
                    // Extract human-readable axis name from URI (last segment)
                    var axisName = axisUri.Contains('/') ? axisUri.Split('/').Last() : axisUri;
                    // Convert camelCase URI segment to readable: hasCausingCondition → Causing Condition
                    axisName = System.Text.RegularExpressions.Regex.Replace(axisName, @"(?<=[a-z])(?=[A-Z])", " ");
                    if (axisName.StartsWith("has ", StringComparison.OrdinalIgnoreCase))
                        axisName = axisName[4..];
                    axisName = char.ToUpper(axisName[0]) + axisName[1..];

                    var isRequired = axis.TryGetProperty("requiredPostcoordination", out var req)
                                     && req.GetString() == "true";

                    // scaleEntity items are URI strings pointing to allowed values
                    // We don't fetch labels for individual values (would require N extra API calls)
                    var allowedValues = new List<string>();
                    if (axis.TryGetProperty("scaleEntity", out var scaleEntities))
                        foreach (var se in scaleEntities.EnumerateArray())
                        {
                            if (se.ValueKind == JsonValueKind.String)
                            {
                                // URI string — extract last path segment as hint
                                var uri = se.GetString() ?? "";
                                // skip raw URIs; axis name is descriptive enough
                            }
                            else if (se.ValueKind == JsonValueKind.Object)
                            {
                                var label = GetLangValue(se, "label");
                                var code  = se.TryGetProperty("linearizationCode", out var lc) ? lc.GetString() : null;
                                if (!string.IsNullOrEmpty(label))
                                    allowedValues.Add(code != null ? $"{code} {label}" : label);
                            }
                        }

                    var entry = new PostcoordAxis(axisName, isRequired, allowedValues);
                    if (isRequired) requiredAxes.Add(entry);
                    else optionalAxes.Add(entry);
                }
            }

            return new Icd11EntityDetails(title, description, exclusions, codedElsewhere, requiredAxes, optionalAxes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ICD-11 entity details failed for '{EntityId}'", entityId);
            return null;
        }
    }

    private static string? GetLangValue(JsonElement root, string property)
    {
        if (root.ValueKind != JsonValueKind.Object) return null;
        if (!root.TryGetProperty(property, out var prop)) return null;
        if (prop.ValueKind == JsonValueKind.Object && prop.TryGetProperty("@value", out var v))
            return v.GetString();
        if (prop.ValueKind == JsonValueKind.String)
            return prop.GetString();
        return null;
    }
}
