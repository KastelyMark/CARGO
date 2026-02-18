using System;
using System.IO;
using System.Text.Json;

namespace CarGo.AdminClient.Helpers;

public static class AppConfig
{
    private const string DefaultApiUrl = "http://localhost:3000/api/";
    private static readonly Lazy<string> _apiBaseUrl = new(() => LoadApiUrl());

    public static string ApiBaseUrl => _apiBaseUrl.Value;

    private static string LoadApiUrl()
    {
        try
        {
            var baseDir = AppContext.BaseDirectory;
            var configPath = Path.Combine(baseDir, "appsettings.json");
            if (!File.Exists(configPath))
            {
                return DefaultApiUrl;
            }

            using var stream = File.OpenRead(configPath);
            using var json = JsonDocument.Parse(stream);
            if (json.RootElement.TryGetProperty("ApiBaseUrl", out var apiProperty))
            {
                var value = apiProperty.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value!.TrimEnd('/') + "/";
                }
            }
        }
        catch
        {
            // ignored, fall back to default
        }

        return DefaultApiUrl;
    }
}

