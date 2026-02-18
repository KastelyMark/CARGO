using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CarGo.AdminClient.Models;

public class ApiMessage
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

public class StatsResponse : ApiMessage
{
    [JsonPropertyName("stats")]
    public DashboardStats? Stats { get; set; }
}

public class MessagesResponse : ApiMessage
{
    [JsonPropertyName("messages")]
    public List<ContactMessage>? Messages { get; set; }
}

public class UsersResponse : ApiMessage
{
    [JsonPropertyName("users")]
    public List<User>? Users { get; set; }
}

public class UserResponse : ApiMessage
{
    [JsonPropertyName("user")]
    public User? User { get; set; }
}

public class RentalsResponse : ApiMessage
{
    [JsonPropertyName("rentals")]
    public List<Rental>? Rentals { get; set; }
}

public class CarsResponse : ApiMessage
{
    [JsonPropertyName("cars")]
    public List<Car>? Cars { get; set; }
}

public class CarResponse : ApiMessage
{
    [JsonPropertyName("car")]
    public Car? Car { get; set; }
}

public class ApiResult<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }

    public static ApiResult<T> From(bool success, T? data, string? message) =>
        new()
        {
            Success = success,
            Data = data,
            Message = message
        };
}

