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

    [JsonPropertyName("icd11_foundation_uri")]
    public string Icd11FoundationUri { get; set; } = "";

    [JsonPropertyName("icd11_mms_code")]
    public string Icd11MmsCode { get; set; } = "";

    [JsonPropertyName("diagnosis_title")]
    public string DiagnosisTitle { get; set; } = "";

    [JsonPropertyName("is_postcoordinated")]
    public bool IsPostcoordinated { get; set; }

    [JsonPropertyName("cluster_details_json")]
    public string? ClusterDetailsJson { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

// ── Service ────────────────────────────────────────────────

public class SupabaseDiagnosisService : IDiagnosisService
{
    private readonly SupabaseRestClient _db;

    public SupabaseDiagnosisService(SupabaseRestClient db) => _db = db;

    public async Task<DiagnosisResponse> SaveAsync(Guid doctorId, SaveDiagnosisRequest request)
    {
        // UPSERT: conflict on anomaly_id → merge-duplicate (update existing row)
        var row = await _db.Upsert<SupabaseDiagnosis>("diagnoses", "anomaly_id", new
        {
            anomaly_id           = request.AnomalyId,
            icd11_foundation_uri = request.Icd11FoundationUri,
            icd11_mms_code       = request.Icd11MmsCode,
            diagnosis_title      = request.DiagnosisTitle,
            is_postcoordinated   = request.IsPostcoordinated,
            cluster_details_json = request.ClusterDetailsJson,
        });

        // Mark anomaly as completed (only if currently in_progress)
        await _db.Update("anomalies",
            $"id=eq.{request.AnomalyId}&status=eq.in_progress",
            new { status = "completed", coded_by = doctorId });

        return MapToResponse(row!);
    }

    public async Task<DiagnosisResponse?> GetByAnomalyIdAsync(int anomalyId)
    {
        var row = await _db.FromSingle<SupabaseDiagnosis>(
            "diagnoses",
            $"anomaly_id=eq.{anomalyId}&select=*");
        return row == null ? null : MapToResponse(row);
    }

    private static DiagnosisResponse MapToResponse(SupabaseDiagnosis d) => new(
        d.Id,
        d.AnomalyId,
        d.Icd11FoundationUri,
        d.Icd11MmsCode,
        d.DiagnosisTitle,
        d.IsPostcoordinated,
        d.ClusterDetailsJson,
        d.CreatedAt
    );
}
