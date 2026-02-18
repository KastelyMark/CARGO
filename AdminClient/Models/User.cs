using System;
using System.Text.Json.Serialization;

namespace CarGo.AdminClient.Models;

public class User
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("address")]
    public string? Address { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("zip_code")]
    public string? ZipCode { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("is_verified")]
    public int IsVerifiedRaw { get; set; }

    [JsonIgnore]
    public bool IsVerified => IsVerifiedRaw == 1;

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }
}

