using AzerDr.API.DTOs;

namespace AzerDr.API.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}

public interface IAnomalyService
{
    Task<DashboardStats> GetStatsAsync(Guid doctorId);
    Task<List<MyCodingItem>> GetMyCodingsAsync(Guid doctorId, int page, int size);
    Task<AnomalyResponse?> GetNextAsync(Guid doctorId);
    Task<bool> SaveCodingAsync(int anomalyId, Guid doctorId, SaveCodingRequest request);
    Task<bool> SaveCodingIcd11Async(int anomalyId, Guid doctorId, SaveIcd11CodingRequest request);
    Task<bool> SkipAsync(int anomalyId, Guid doctorId);
    Task<bool> ReportErrorAsync(int anomalyId, Guid doctorId, ErrorReportRequest request);
    Task<List<LeaderboardItem>> GetLeaderboardAsync();
}

public interface IIcdService
{
    Task<List<IcdRubrikaDto>> GetRubrikasAsync();
    Task<List<IcdBashliqDto>> GetBashliqlarAsync(int rubrikaId);
    Task<List<IcdDiaqnozDto>> GetDiaqnozlarAsync(int bashliqId);
    Task<List<IcdQeydDto>> GetQeydlerAsync(int diaqnozId);
}

public interface IAdminService
{
    Task<List<DoctorListItem>> GetDoctorsAsync();
    Task<DoctorListItem?> CreateDoctorAsync(CreateDoctorRequest request);
    Task<bool> UpdateDoctorAsync(Guid id, UpdateDoctorRequest request);
    Task<bool> DeleteDoctorAsync(Guid id);
    Task<List<ProgressItem>> GetProgressAsync();
    Task<List<ErrorReportItem>> GetErrorReportsAsync(string? status = null);
    Task<bool> ReviewErrorReportAsync(int id, string status);
}
