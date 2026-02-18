using System.Windows;
using CarGo.AdminClient.Models;

namespace CarGo.AdminClient.Views;

public partial class UserEditWindow : Window
{
    public UserUpdateRequest? Result { get; private set; }

    public UserEditWindow(User user)
    {
        InitializeComponent();
        NameTextBox.Text = user.Name ?? string.Empty;
        EmailTextBox.Text = user.Email ?? string.Empty;
        PhoneTextBox.Text = user.Phone ?? string.Empty;
        FirstNameTextBox.Text = user.FirstName ?? string.Empty;
        LastNameTextBox.Text = user.LastName ?? string.Empty;
        CityTextBox.Text = user.City ?? string.Empty;
        ZipTextBox.Text = user.ZipCode ?? string.Empty;
        CountryTextBox.Text = user.Country ?? string.Empty;
        AddressTextBox.Text = user.Address ?? string.Empty;
        VerifiedCheckBox.IsChecked = user.IsVerified;
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        Result = new UserUpdateRequest
        {
            Name = NullIfEmpty(NameTextBox.Text),
            Email = NullIfEmpty(EmailTextBox.Text),
            Phone = NullIfEmpty(PhoneTextBox.Text),
            FirstName = NullIfEmpty(FirstNameTextBox.Text),
            LastName = NullIfEmpty(LastNameTextBox.Text),
            City = NullIfEmpty(CityTextBox.Text),
            ZipCode = NullIfEmpty(ZipTextBox.Text),
            Country = NullIfEmpty(CountryTextBox.Text),
            Address = NullIfEmpty(AddressTextBox.Text),
            IsVerified = VerifiedCheckBox.IsChecked,
            Password = NullIfEmpty(PasswordBox.Password)
        };

        DialogResult = true;
        Close();
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

