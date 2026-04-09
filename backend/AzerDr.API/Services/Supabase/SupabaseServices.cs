using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using AzerDr.API.DTOs;
using AzerDr.API.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace AzerDr.API.Services.Supabase;

// ── JSON models for Supabase REST responses ────────────────

internal class SupabaseUser
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = "";

    [JsonPropertyName("password_hash")]
    public string PasswordHash { get; set; } = "";

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = "";

    [JsonPropertyName("role")]
    public string Role { get; set; } = "";

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

internal class SupabaseAnomaly
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("report_id")]
    public string ReportId { get; set; } = "";

    [JsonPropertyName("patient_id")]
    public string PatientId { get; set; } = "";

    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("diagnosis")]
    public string Diagnosis { get; set; } = "";

    [JsonPropertyName("explanation")]
    public string Explanation { get; set; } = "";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";
}

internal class SupabaseCoding
{
    [JsonPropertyName("anomaly_id")]
    public int AnomalyId { get; set; }

    [JsonPropertyName("doctor_id")]
    public Guid DoctorId { get; set; }

    [JsonPropertyName("diaqnoz_code")]
    public string DiaqnozCode { get; set; } = "";

    [JsonPropertyName("diaqnoz_name")]
    public string DiaqnozName { get; set; } = "";

    [JsonPropertyName("qeyd")]
    public string? Qeyd { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

internal class SupabaseCodingWithAnomaly : SupabaseCoding
{
    [JsonPropertyName("anomalies")]
    public SupabaseAnomaly? Anomaly { get; set; }
}

internal class SupabaseIcdItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = "";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
}

internal class SupabaseQeyd
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";
}

internal class SupabaseErrorReport
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("anomaly_id")]
    public int AnomalyId { get; set; }

    [JsonPropertyName("doctor_id")]
    public Guid DoctorId { get; set; }

    [JsonPropertyName("field_name")]
    public string FieldName { get; set; } = "";

    [JsonPropertyName("corrected_text")]
    public string CorrectedText { get; set; } = "";

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

internal class StatsResult
{
    [JsonPropertyName("total")]
    public long Total { get; set; }

    [JsonPropertyName("coded")]
    public long Coded { get; set; }

    [JsonPropertyName("pending")]
    public long Pending { get; set; }

    [JsonPropertyName("in_progress")]
    public long InProgress { get; set; }

    [JsonPropertyName("my_codings")]
    public long MyCodings { get; set; }
}

// ── Service Implementations ────────────────────────────────

public class SupabaseAuthService : IAuthService
{
    private readonly SupabaseRestClient _client;
    private readonly IConfiguration _config;

    public SupabaseAuthService(SupabaseRestClient client, IConfiguration config)
    {
        _client = client;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var users = await _client.From<SupabaseUser>("users",
            $"username=eq.{Uri.EscapeDataString(request.Username)}&is_active=eq.true&limit=1");

        var user = users.FirstOrDefault();
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        var token = GenerateToken(user);
        return new LoginResponse(token, user.Username, user.FullName, user.Role);
    }

    private string GenerateToken(SupabaseUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.GivenName, user.FullName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class SupabaseAnomalyService : IAnomalyService
{
    private readonly SupabaseRestClient _client;

    public SupabaseAnomalyService(SupabaseRestClient client) => _client = client;

    public async Task<DashboardStats> GetStatsAsync(Guid doctorId)
    {
        var results = await _client.Rpc<StatsResult>("get_dashboard_stats",
            new { p_doctor_id = doctorId });
        var s = results.FirstOrDefault();
        if (s == null)
            return new DashboardStats(0, 0, 0, 0, 0);
        return new DashboardStats((int)s.Total, (int)s.Coded, (int)s.Pending, (int)s.InProgress, (int)s.MyCodings);
    }

    public async Task<List<MyCodingItem>> GetMyCodingsAsync(Guid doctorId, int page, int size)
    {
        var offset = (page - 1) * size;
        var codings = await _client.From<SupabaseCodingWithAnomaly>("anomaly_codings",
            $"doctor_id=eq.{doctorId}&select=anomaly_id,diaqnoz_code,diaqnoz_name,qeyd,created_at,anomalies(patient_id,date)&order=created_at.desc&offset={offset}&limit={size}");

        return codings.Select(c => new MyCodingItem(
            c.AnomalyId,
            c.Anomaly?.PatientId ?? "",
            c.Anomaly?.Date ?? "",
            c.DiaqnozCode,
            c.DiaqnozName,
            c.Qeyd,
            c.CreatedAt
        )).ToList();
    }

    public async Task<AnomalyResponse?> GetNextAsync(Guid doctorId)
    {
        var results = await _client.Rpc<SupabaseAnomaly>("get_next_anomaly",
            new { p_doctor_id = doctorId });
        var a = results.FirstOrDefault();
        if (a == null) return null;
        return new AnomalyResponse(a.Id, a.ReportId, a.PatientId, a.Date, a.Diagnosis, a.Explanation);
    }

    public async Task<bool> SaveCodingAsync(int anomalyId, Guid doctorId, SaveCodingRequest request)
    {
        var result = await _client.RpcSingle<bool>("save_coding", new
        {
            p_anomaly_id = anomalyId,
            p_doctor_id = doctorId,
            p_rubrika_code = request.RubrikaCode,
            p_rubrika_name = request.RubrikaName,
            p_bashliq_code = request.BashliqCode,
            p_bashliq_name = request.BashliqName,
            p_diaqnoz_code = request.DiaqnozCode,
            p_diaqnoz_name = request.DiaqnozName,
            p_icd_qeyd_name = request.IcdQeydName,
            p_qeyd = request.Qeyd
        });
        return result ?? false;
    }

    public async Task<bool> SkipAsync(int anomalyId, Guid doctorId)
    {
        var result = await _client.RpcSingle<bool>("skip_anomaly", new
        {
            p_anomaly_id = anomalyId,
            p_doctor_id = doctorId
        });
        return result ?? false;
    }

    public async Task<bool> ReportErrorAsync(int anomalyId, Guid doctorId, ErrorReportRequest request)
    {
        // Check anomaly exists
        var anomalies = await _client.From<SupabaseAnomaly>("anomalies",
            $"id=eq.{anomalyId}&limit=1");
        if (anomalies.Count == 0) return false;

        await _client.Insert<object>("error_reports", new
        {
            anomaly_id = anomalyId,
            doctor_id = doctorId,
            field_name = request.FieldName,
            corrected_text = request.CorrectedText,
            note = request.Note
        });
        return true;
    }
}

public class SupabaseIcdService : IIcdService
{
    private readonly SupabaseRestClient _client;

    public SupabaseIcdService(SupabaseRestClient client) => _client = client;

    public async Task<List<IcdRubrikaDto>> GetRubrikasAsync()
    {
        var items = await _client.From<SupabaseIcdItem>("icd_rubrikas", "order=id.asc");
        return items.Select(i => new IcdRubrikaDto(i.Id, i.Code, i.Name)).ToList();
    }

    public async Task<List<IcdBashliqDto>> GetBashliqlarAsync(int rubrikaId)
    {
        var items = await _client.From<SupabaseIcdItem>("icd_bashliqlar",
            $"rubrika_id=eq.{rubrikaId}&order=id.asc");
        return items.Select(i => new IcdBashliqDto(i.Id, i.Code, i.Name)).ToList();
    }

    public async Task<List<IcdDiaqnozDto>> GetDiaqnozlarAsync(int bashliqId)
    {
        var items = await _client.From<SupabaseIcdItem>("icd_diaqnozlar",
            $"bashliq_id=eq.{bashliqId}&order=id.asc");
        return items.Select(i => new IcdDiaqnozDto(i.Id, i.Code, i.Name)).ToList();
    }

    public async Task<List<IcdQeydDto>> GetQeydlerAsync(int diaqnozId)
    {
        var items = await _client.From<SupabaseQeyd>("icd_qeydler",
            $"diaqnoz_id=eq.{diaqnozId}&order=id.asc");
        return items.Select(i => new IcdQeydDto(i.Id, i.Name)).ToList();
    }
}

public class SupabaseAdminService : IAdminService
{
    private readonly SupabaseRestClient _client;

    public SupabaseAdminService(SupabaseRestClient client) => _client = client;

    public async Task<List<DoctorListItem>> GetDoctorsAsync()
    {
        var users = await _client.From<SupabaseUser>("users",
            "order=created_at.asc");

        // Exclude the current admin viewing the list? No, show all users
        var doctorIds = users.Select(u => u.Id).ToList();
        var codingCounts = new Dictionary<Guid, int>();
        foreach (var uid in doctorIds)
        {
            var codings = await _client.From<SupabaseCoding>("anomaly_codings",
                $"doctor_id=eq.{uid}&select=anomaly_id");
            codingCounts[uid] = codings.Count;
        }

        return users.Select(u => new DoctorListItem(
            u.Id, u.Username, u.FullName, u.Role, u.IsActive,
            codingCounts.GetValueOrDefault(u.Id, 0),
            u.CreatedAt
        )).ToList();
    }

    public async Task<DoctorListItem?> CreateDoctorAsync(CreateDoctorRequest request)
    {
        // Check if username exists
        var existing = await _client.From<SupabaseUser>("users",
            $"username=eq.{Uri.EscapeDataString(request.Username)}&limit=1");
        if (existing.Count > 0) return null;

        var result = await _client.Insert<SupabaseUser>("users", new
        {
            username = request.Username,
            password_hash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            full_name = request.FullName,
            role = request.Role ?? "doctor"
        });

        if (result == null) return null;
        return new DoctorListItem(result.Id, result.Username, result.FullName, result.Role, result.IsActive, 0, result.CreatedAt);
    }

    public async Task<bool> UpdateDoctorAsync(Guid id, UpdateDoctorRequest request)
    {
        var updateData = new Dictionary<string, object?>();
        if (request.FullName != null) updateData["full_name"] = request.FullName;
        if (request.Password != null) updateData["password_hash"] = BCrypt.Net.BCrypt.HashPassword(request.Password);
        if (request.IsActive.HasValue) updateData["is_active"] = request.IsActive.Value;
        if (request.Role != null) updateData["role"] = request.Role;

        if (updateData.Count == 0) return true;

        var rows = await _client.Update("users", $"id=eq.{id}", updateData);
        return rows > 0;
    }

    public async Task<bool> DeleteDoctorAsync(Guid id)
    {
        var rows = await _client.Update("users", $"id=eq.{id}&role=eq.doctor",
            new { is_active = false });
        return rows > 0;
    }

    public async Task<List<ProgressItem>> GetProgressAsync()
    {
        var doctors = await _client.From<SupabaseUser>("users",
            "role=eq.doctor&is_active=eq.true");

        var items = new List<ProgressItem>();
        foreach (var d in doctors)
        {
            var codings = await _client.From<SupabaseCoding>("anomaly_codings",
                $"doctor_id=eq.{d.Id}&select=created_at&order=created_at.desc&limit=1");

            items.Add(new ProgressItem(
                d.Id, d.FullName,
                codings.Count > 0 ? codings.Count : 0, // Need separate count call
                codings.FirstOrDefault()?.CreatedAt
            ));
        }

        // Fix: get actual count for each doctor
        foreach (var item in items)
        {
            var allCodings = await _client.From<SupabaseCoding>("anomaly_codings",
                $"doctor_id=eq.{item.DoctorId}&select=anomaly_id");
            items[items.IndexOf(item)] = item with { CodingCount = allCodings.Count };
        }

        return items.OrderByDescending(i => i.CodingCount).ToList();
    }

    public async Task<List<ErrorReportItem>> GetErrorReportsAsync(string? status = null)
    {
        var filter = "select=id,anomaly_id,doctor_id,field_name,corrected_text,note,status,created_at,anomalies(patient_id,diagnosis,explanation),users!error_reports_doctor_id_fkey(full_name)&order=created_at.desc";
        if (status != null)
            filter += $"&status=eq.{Uri.EscapeDataString(status)}";

        // Simplified: use separate queries due to PostgREST join complexity
        var reports = await _client.From<SupabaseErrorReport>("error_reports",
            status != null ? $"status=eq.{Uri.EscapeDataString(status)}&order=created_at.desc" : "order=created_at.desc");

        var items = new List<ErrorReportItem>();
        foreach (var r in reports)
        {
            var anomalies = await _client.From<SupabaseAnomaly>("anomalies", $"id=eq.{r.AnomalyId}&limit=1");
            var doctors = await _client.From<SupabaseUser>("users", $"id=eq.{r.DoctorId}&limit=1");
            var anomaly = anomalies.FirstOrDefault();
            var doctor = doctors.FirstOrDefault();

            var originalText = r.FieldName == "diagnosis" ? anomaly?.Diagnosis : anomaly?.Explanation;

            items.Add(new ErrorReportItem(
                r.Id, r.AnomalyId,
                anomaly?.PatientId ?? "",
                doctor?.FullName ?? "",
                r.FieldName, originalText ?? "",
                r.CorrectedText, r.Note, r.Status, r.CreatedAt
            ));
        }
        return items;
    }

    public async Task<bool> ReviewErrorReportAsync(int id, string status)
    {
        var rows = await _client.Update("error_reports", $"id=eq.{id}",
            new { status });
        return rows > 0;
    }
}
