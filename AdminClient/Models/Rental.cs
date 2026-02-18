using System;
using System.Text.Json.Serialization;

namespace CarGo.AdminClient.Models;

public class Rental
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("car_id")]
    public int CarId { get; set; }

    [JsonPropertyName("car_name")]
    public string? CarName { get; set; }

    [JsonPropertyName("car_price")]
    public string? CarPrice { get; set; }

    [JsonPropertyName("rental_date")]
    public DateTime? RentalDate { get; set; }

    [JsonPropertyName("return_date")]
    public DateTime? ReturnDate { get; set; }

    [JsonPropertyName("customer_name")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("customer_email")]
    public string? CustomerEmail { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }
}

