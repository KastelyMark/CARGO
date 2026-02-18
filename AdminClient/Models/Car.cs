using System.Collections.Generic;
using System.Globalization;
using System.Text.Json.Serialization;

namespace CarGo.AdminClient.Models;

public class Car
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("price_per_day")]
    public string? PricePerDayRaw { get; set; }

    [JsonIgnore]
    public decimal PricePerDay
    {
        get
        {
            if (decimal.TryParse(PricePerDayRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var value))
            {
                return value;
            }
            return 0;
        }
    }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("features")]
    public List<string> Features { get; set; } = new();

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("transmission")]
    public string? Transmission { get; set; }

    [JsonPropertyName("fuel_type")]
    public string? FuelType { get; set; }

    [JsonPropertyName("seats")]
    public int Seats { get; set; } = 5;
}

