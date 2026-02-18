namespace CarGo.AdminClient.Models;

public class EmailRequest
{
    public string? ToEmail { get; set; }
    public string? ToName { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
}

public class UserUpdateRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? ZipCode { get; set; }
    public string? Country { get; set; }
    public bool? IsVerified { get; set; }
    public string? Password { get; set; }
}

public class CarUpsertRequest
{
    public int? Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? PricePerDay { get; set; }
    public string? Category { get; set; }
    public string? Transmission { get; set; }
    public string? FuelType { get; set; }
    public int? Seats { get; set; }
    public string? ImagePath { get; set; }
}

