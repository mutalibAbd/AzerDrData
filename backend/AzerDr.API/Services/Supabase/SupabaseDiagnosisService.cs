using System.Text.Json;
using System.Text.Json.Serialization;
using AzerDr.API.DTOs;
using AzerDr.API.Services.Interfaces;

namespace AzerDr.API.Services.Supabase;

// ── Internal JSON model ────────────────────────────────────

internal class SupabaseDiagnosis
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("anomaly_id")]
    public int AnomalyId { get; set; }

    [JsonPropertyName("doctor_id")]
    public Guid DoctorId { get; set; }

    [JsonPropertyName("icd11_foundation_uri")]
    public string Icd11FoundationUri { get; set; } = "";

    [JsonPropertyName("icd11_mms_code")]
    public string Icd11MmsCode { get; set; } = "";

    [JsonPropertyName("diagnosis_title")]
    public string DiagnosisTitle { get; set; } = "";

    [JsonPropertyName("is_postcoordinated")]
    public bool IsPostcoordinated { get; set; }

    [JsonPropertyName("cluster_details_json")]
    public JsonElement? ClusterDetailsJson { get; set; }

    [JsonPropertyName("doctor_note")]
    public string? DoctorNote { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

internal class SupabaseDiagnosisWithAnomaly
{
    [JsonPropertyName("anomaly_id")]
    public int AnomalyId { get; set; }

    [JsonPropertyName("icd11_mms_code")]
    public string Icd11MmsCode { get; set; } = "";

    [JsonPropertyName("diagnosis_title")]
    public string DiagnosisTitle { get; set; } = "";

    [JsonPropertyName("is_postcoordinated")]
    public bool IsPostcoordinated { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("anomalies")]
    public SupabaseEmbeddedAnomaly? Anomaly { get; set; }
}

internal class SupabaseEmbeddedAnomaly
{
    [JsonPropertyName("patient_id")]
    public string PatientId { get; set; } = "";

    [JsonPropertyName("date")]
    public string Date { get; set; } = "";
}

// ── Service ────────────────────────────────────────────────

public class SupabaseDiagnosisService : IDiagnosisService
{
    private readonly SupabaseRestClient _db;

    public SupabaseDiagnosisService(SupabaseRestClient db) => _db = db;

    public async Task<DiagnosisResponse> SaveAsync(Guid doctorId, SaveDiagnosisRequest request)
    {
        // Parse ClusterDetailsJson string → JsonElement so System.Text.Json serializes it
        // as a raw JSON object (not a quoted string), preventing double-stringification in PostgreSQL jsonb.
        JsonElement? clusterJson = null;
        if (request.ClusterDetailsJson != null)
        {
            try { clusterJson = JsonDocument.Parse(request.ClusterDetailsJson).RootElement; }
            catch (JsonException) { /* invalid JSON — store null rather than corrupt data */ }
        }

        // UPSERT: conflict on anomaly_id → merge-duplicate (update existing row)
        var row = await _db.Upsert<SupabaseDiagnosis>("diagnoses", "anomaly_id", new
        {
            anomaly_id           = request.AnomalyId,
            doctor_id            = doctorId,
            icd11_foundation_uri = request.Icd11FoundationUri,
            icd11_mms_code       = request.Icd11MmsCode,
            diagnosis_title      = request.DiagnosisTitle,
            is_postcoordinated   = request.IsPostcoordinated,
            cluster_details_json = clusterJson,
            doctor_note          = request.DoctorNote,
        });

        // Mark anomaly as completed (only if currently in_progress)
        await _db.Update("anomalies",
            $"id=eq.{request.AnomalyId}&status=eq.in_progress",
            new { status = "completed", coded_by = doctorId });

        return MapToResponse(row!);
    }

    public async Task<DiagnosisResponse?> GetByAnomalyIdAsync(int anomalyId, Guid doctorId)
    {
        var row = await _db.FromSingle<SupabaseDiagnosis>(
            "diagnoses",
            $"anomaly_id=eq.{anomalyId}&doctor_id=eq.{doctorId}&select=*");
        return row == null ? null : MapToResponse(row);
    }

    public async Task<List<MyDiagnosisItem>> GetMyDiagnosesAsync(Guid doctorId, int page, int size)
    {
        var offset = (page - 1) * size;
        var rows = await _db.From<SupabaseDiagnosisWithAnomaly>(
            "diagnoses",
            $"doctor_id=eq.{doctorId}&select=anomaly_id,icd11_mms_code,diagnosis_title,is_postcoordinated,created_at,anomalies(patient_id,date)&order=created_at.desc&limit={size}&offset={offset}");

        return rows.Select(r => new MyDiagnosisItem(
            r.AnomalyId,
            r.Anomaly?.PatientId ?? "",
            r.Anomaly?.Date ?? "",
            r.Icd11MmsCode,
            r.DiagnosisTitle,
            r.IsPostcoordinated,
            r.CreatedAt
        )).ToList();
    }

    private static DiagnosisResponse MapToResponse(SupabaseDiagnosis d) => new(
        d.Id,
        d.AnomalyId,
        d.Icd11FoundationUri,
        d.Icd11MmsCode,
        d.DiagnosisTitle,
        d.IsPostcoordinated,
        d.ClusterDetailsJson?.GetRawText(),
        d.DoctorNote,
        d.CreatedAt
    );

    public async Task<bool> DeleteByAnomalyIdAsync(int anomalyId, Guid doctorId)
    {
        // Delete the diagnosis row
        var deleted = await _db.Delete("diagnoses",
            $"anomaly_id=eq.{anomalyId}&doctor_id=eq.{doctorId}");

        if (deleted > 0)
        {
            // Reset anomaly status so doctor can re-code it
            await _db.Update("anomalies",
                $"id=eq.{anomalyId}",
                new { status = "in_progress", coded_by = (Guid?)null });
        }

        return deleted > 0;
    }
}
