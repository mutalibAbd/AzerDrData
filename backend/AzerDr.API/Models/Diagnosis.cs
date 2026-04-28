namespace AzerDr.API.Models;

public class Diagnosis
{
    public Guid Id { get; set; }
    public int AnomalyId { get; set; }
    public string Icd11FoundationUri { get; set; } = "";
    public string Icd11MmsCode { get; set; } = "";
    public string DiagnosisTitle { get; set; } = "";
    public bool IsPostcoordinated { get; set; }
    public string? ClusterDetailsJson { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Anomaly? Anomaly { get; set; }
}
