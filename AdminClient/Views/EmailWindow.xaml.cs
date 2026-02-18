using System.Windows;
using CarGo.AdminClient.Models;

namespace CarGo.AdminClient.Views;

public partial class EmailWindow : Window
{
    public EmailRequest? Result { get; private set; }

    public EmailWindow(string toName, string toEmail)
    {
        InitializeComponent();
        NameTextBox.Text = toName;
        EmailTextBox.Text = toEmail;
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private void SendButton_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(SubjectTextBox.Text) || string.IsNullOrWhiteSpace(MessageTextBox.Text))
        {
            MessageBox.Show("A tárgy és az üzenet megadása kötelező.", "Hiba", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        Result = new EmailRequest
        {
            ToName = NameTextBox.Text,
            ToEmail = EmailTextBox.Text,
            Subject = SubjectTextBox.Text.Trim(),
            Message = MessageTextBox.Text.Trim()
        };

        DialogResult = true;
        Close();
    }
}

