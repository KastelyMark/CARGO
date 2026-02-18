using System.Text.Json.Serialization;

namespace CarGo.AdminClient.Models;

public class DashboardStats
{
    [JsonPropertyName("users")]
    public int Users { get; set; }

    [JsonPropertyName("registeredUsers")]
    public int RegisteredUsers { get; set; }

    [JsonPropertyName("messages")]
    public int Messages { get; set; }

    [JsonPropertyName("newMessages")]
    public int NewMessages { get; set; }

    [JsonPropertyName("rentals")]
    public int Rentals { get; set; }

    [JsonPropertyName("pendingRentals")]
    public int PendingRentals { get; set; }

    [JsonPropertyName("cars")]
    public int Cars { get; set; }
}

