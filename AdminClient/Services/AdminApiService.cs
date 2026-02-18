using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CarGo.AdminClient.Models;

namespace CarGo.AdminClient.Services;

public class AdminApiService : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public AdminApiService(string baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new ArgumentException("API base URL is required.", nameof(baseUrl));
        }

        var handler = new HttpClientHandler
        {
            CookieContainer = new CookieContainer(),
            AutomaticDecompression = DecompressionMethods.Brotli | DecompressionMethods.GZip | DecompressionMethods.Deflate,
            UseCookies = true
        };

        var normalized = baseUrl.EndsWith("/") ? baseUrl : $"{baseUrl}/";

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri(normalized)
        };
    }

    public Task<ApiResult<bool>> LoginAsync(string password, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() =>
            _httpClient.PostAsJsonAsync("admin/login", new { password }, cancellationToken));

    public Task<ApiResult<bool>> LogoutAsync(CancellationToken cancellationToken = default) =>
        SendCommandAsync(() => _httpClient.PostAsync("admin/logout", null, cancellationToken));

    public Task<ApiResult<bool>> CheckAdminStatusAsync(CancellationToken cancellationToken = default) =>
        SendResultAsync<ApiMessage, bool>(
            () => _httpClient.GetAsync("admin/status", cancellationToken),
            payload => payload?.Success ?? false);

    public Task<ApiResult<DashboardStats?>> GetStatsAsync(CancellationToken cancellationToken = default) =>
        SendResultAsync<StatsResponse, DashboardStats?>(
            () => _httpClient.GetAsync("admin/stats", cancellationToken),
            payload => payload?.Stats);

    public Task<ApiResult<List<ContactMessage>?>> GetMessagesAsync(CancellationToken cancellationToken = default) =>
        SendResultAsync<MessagesResponse, List<ContactMessage>?>(
            () => _httpClient.GetAsync("admin/messages", cancellationToken),
            payload => payload?.Messages);

    public Task<ApiResult<bool>> UpdateMessageStatusAsync(int id, string status, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() =>
            _httpClient.PutAsJsonAsync($"admin/messages/{id}/status", new { status }, cancellationToken));

    public Task<ApiResult<bool>> DeleteMessageAsync(int id, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() => _httpClient.DeleteAsync($"admin/messages/{id}", cancellationToken));

    public Task<ApiResult<List<User>?>> GetUsersAsync(string? status, CancellationToken cancellationToken = default)
    {
        var query = new List<string> { "all=1" };
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query.Add($"status={status}");
        }

        var path = $"admin/users?{string.Join("&", query)}";
        return SendResultAsync<UsersResponse, List<User>?>(
            () => _httpClient.GetAsync(path, cancellationToken),
            payload => payload?.Users);
    }

    public Task<ApiResult<User?>> GetUserAsync(int id, CancellationToken cancellationToken = default) =>
        SendResultAsync<UserResponse, User?>(
            () => _httpClient.GetAsync($"admin/users/{id}", cancellationToken),
            payload => payload?.User);

    public Task<ApiResult<bool>> UpdateUserAsync(int id, UserUpdateRequest update, CancellationToken cancellationToken = default)
    {
        var payload = new Dictionary<string, object?>();

        void AddIfNotEmpty(string key, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                payload[key] = value;
            }
        }

        AddIfNotEmpty("name", update.Name);
        AddIfNotEmpty("email", update.Email);
        AddIfNotEmpty("phone", update.Phone);
        AddIfNotEmpty("first_name", update.FirstName);
        AddIfNotEmpty("last_name", update.LastName);
        AddIfNotEmpty("address", update.Address);
        AddIfNotEmpty("city", update.City);
        AddIfNotEmpty("zip_code", update.ZipCode);
        AddIfNotEmpty("country", update.Country);

        if (update.IsVerified.HasValue)
        {
            payload["is_verified"] = update.IsVerified.Value ? 1 : 0;
        }

        if (!string.IsNullOrWhiteSpace(update.Password))
        {
            payload["password"] = update.Password;
        }

        if (payload.Count == 0)
        {
            return Task.FromResult(ApiResult<bool>.From(false, false, "Nincs frissítendő mező."));
        }

        return SendCommandAsync(() =>
            _httpClient.PutAsJsonAsync($"admin/users/{id}", payload, cancellationToken));
    }

    public Task<ApiResult<bool>> DeleteUserAsync(int id, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() => _httpClient.DeleteAsync($"admin/users/{id}", cancellationToken));

    public Task<ApiResult<List<Rental>?>> GetRentalsAsync(CancellationToken cancellationToken = default) =>
        SendResultAsync<RentalsResponse, List<Rental>?>(
            () => _httpClient.GetAsync("admin/rentals", cancellationToken),
            payload => payload?.Rentals);

    public Task<ApiResult<bool>> UpdateRentalStatusAsync(int id, string status, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() =>
            _httpClient.PutAsJsonAsync($"admin/rentals/{id}/status", new { status }, cancellationToken));

    public Task<ApiResult<bool>> DeleteRentalAsync(int id, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() => _httpClient.DeleteAsync($"admin/rentals/{id}", cancellationToken));

    public Task<ApiResult<List<Car>?>> GetCarsAsync(CancellationToken cancellationToken = default) =>
        SendResultAsync<CarsResponse, List<Car>?>(
            () => _httpClient.GetAsync("cars?admin=1", cancellationToken),
            payload => payload?.Cars);

    public Task<ApiResult<Car?>> GetCarAsync(int id, CancellationToken cancellationToken = default) =>
        SendResultAsync<CarResponse, Car?>(
            () => _httpClient.GetAsync($"admin/cars/{id}", cancellationToken),
            payload => payload?.Car);

    public Task<ApiResult<bool>> CreateCarAsync(CarUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var content = BuildCarFormContent(request);
        return SendCommandAsync(() =>
            _httpClient.PostAsync("admin/cars", content, cancellationToken));
    }

    public Task<ApiResult<bool>> UpdateCarAsync(CarUpsertRequest request, CancellationToken cancellationToken = default)
    {
        if (!request.Id.HasValue)
        {
            return Task.FromResult(ApiResult<bool>.From(false, false, "Azonosító szükséges a frissítéshez."));
        }

        var content = BuildCarFormContent(request);
        return SendCommandAsync(() =>
            _httpClient.PutAsync($"admin/cars/{request.Id.Value}", content, cancellationToken));
    }

    public Task<ApiResult<bool>> DeleteCarAsync(int id, CancellationToken cancellationToken = default) =>
        SendCommandAsync(() => _httpClient.DeleteAsync($"admin/cars/{id}", cancellationToken));

    public Task<ApiResult<bool>> SendEmailAsync(EmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail) ||
            string.IsNullOrWhiteSpace(request.ToName) ||
            string.IsNullOrWhiteSpace(request.Subject) ||
            string.IsNullOrWhiteSpace(request.Message))
        {
            return Task.FromResult(ApiResult<bool>.From(false, false, "Minden mező kitöltése kötelező."));
        }

        return SendCommandAsync(() =>
            _httpClient.PostAsJsonAsync("admin/send-email", new
            {
                toEmail = request.ToEmail,
                toName = request.ToName,
                subject = request.Subject,
                message = request.Message
            }, cancellationToken));
    }

    private MultipartFormDataContent BuildCarFormContent(CarUpsertRequest request)
    {
        var content = new MultipartFormDataContent();

        void AddString(string key, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                content.Add(new StringContent(value), key);
            }
        }

        AddString("name", request.Name);
        AddString("description", request.Description);

        if (request.PricePerDay.HasValue)
        {
            var formatted = request.PricePerDay.Value.ToString(CultureInfo.InvariantCulture);
            content.Add(new StringContent(formatted), "price_per_day");
        }

        AddString("category", request.Category);
        AddString("transmission", request.Transmission);
        AddString("fuel_type", request.FuelType);

        if (request.Seats.HasValue)
        {
            content.Add(new StringContent(request.Seats.Value.ToString(CultureInfo.InvariantCulture)), "seats");
        }

        if (!string.IsNullOrWhiteSpace(request.ImagePath) && File.Exists(request.ImagePath))
        {
            var streamContent = new StreamContent(File.OpenRead(request.ImagePath));
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(GetMimeType(request.ImagePath));
            content.Add(streamContent, "image", Path.GetFileName(request.ImagePath));
        }

        return content;
    }

    private static string GetMimeType(string path)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }

    private Task<ApiResult<bool>> SendCommandAsync(Func<Task<HttpResponseMessage>> requestFactory) =>
        SendResultAsync<ApiMessage, bool>(requestFactory, payload => payload?.Success ?? false);

    private async Task<ApiResult<TData>> SendResultAsync<TResponse, TData>(
        Func<Task<HttpResponseMessage>> requestFactory,
        Func<TResponse?, TData> selector)
        where TResponse : ApiMessage
    {
        try
        {
            using var response = await requestFactory().ConfigureAwait(false);
            var payload = await DeserializeAsync<TResponse>(response).ConfigureAwait(false);
            var data = payload is null ? default : selector(payload);
            return BuildResult(response, payload, data);
        }
        catch (Exception ex)
        {
            return ApiResult<TData>.From(false, default, ex.Message);
        }
    }

    private ApiResult<T> BuildResult<T>(HttpResponseMessage response, ApiMessage? payload, T? data)
    {
        var success = payload?.Success ?? response.IsSuccessStatusCode;
        var message = payload?.Message;

        if (!success && string.IsNullOrWhiteSpace(message))
        {
            message = $"{(int)response.StatusCode} {response.ReasonPhrase}";
        }

        return ApiResult<T>.From(success, data, message);
    }

    private async Task<TResponse?> DeserializeAsync<TResponse>(HttpResponseMessage response)
    {
        await using var stream = await response.Content.ReadAsStreamAsync().ConfigureAwait(false);
        if (stream == null || stream == Stream.Null)
        {
            return default;
        }

        return await JsonSerializer.DeserializeAsync<TResponse>(stream, _jsonOptions).ConfigureAwait(false);
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}

