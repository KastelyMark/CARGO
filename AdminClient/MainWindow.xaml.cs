using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows;
using CarGo.AdminClient.Helpers;
using CarGo.AdminClient.Models;
using CarGo.AdminClient.Services;
using CarGo.AdminClient.Views;

namespace CarGo.AdminClient;

public partial class MainWindow : Window, INotifyPropertyChanged
{
    private readonly AdminApiService _apiService;
    private bool _isLoggedIn;
    private bool _isBusy;
    private string _selectedUserFilter = "registered";
    private DashboardStats? _stats;
    private ContactMessage? _selectedMessage;
    private User? _selectedUser;
    private Rental? _selectedRental;
    private Car? _selectedCar;
    private string? _statusMessage = "Kérjük jelentkezzen be.";
    private bool _statusIsError;

    public ObservableCollection<ContactMessage> Messages { get; } = new();
    public ObservableCollection<User> Users { get; } = new();
    public ObservableCollection<Rental> Rentals { get; } = new();
    public ObservableCollection<Car> Cars { get; } = new();

    public DashboardStats? Stats
    {
        get => _stats;
        set => SetField(ref _stats, value);
    }

    public bool IsLoggedIn
    {
        get => _isLoggedIn;
        set
        {
            if (SetField(ref _isLoggedIn, value))
            {
                LoginPanel.Visibility = value ? Visibility.Collapsed : Visibility.Visible;
                AdminPanel.Visibility = value ? Visibility.Visible : Visibility.Collapsed;
            }
        }
    }

    public bool IsBusy
    {
        get => _isBusy;
        set => SetField(ref _isBusy, value);
    }

    public string SelectedUserFilter
    {
        get => _selectedUserFilter;
        set => SetField(ref _selectedUserFilter, value);
    }

    public ContactMessage? SelectedMessage
    {
        get => _selectedMessage;
        set => SetField(ref _selectedMessage, value);
    }

    public User? SelectedUser
    {
        get => _selectedUser;
        set => SetField(ref _selectedUser, value);
    }

    public Rental? SelectedRental
    {
        get => _selectedRental;
        set => SetField(ref _selectedRental, value);
    }

    public Car? SelectedCar
    {
        get => _selectedCar;
        set => SetField(ref _selectedCar, value);
    }

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetField(ref _statusMessage, value);
    }

    public bool StatusIsError
    {
        get => _statusIsError;
        set => SetField(ref _statusIsError, value);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public MainWindow()
    {
        InitializeComponent();
        DataContext = this;
        _apiService = new AdminApiService(AppConfig.ApiBaseUrl);
        Loaded += MainWindow_Loaded;
        Closed += (_, _) => _apiService.Dispose();
        UserFilterCombo.SelectedIndex = 0;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        var status = await _apiService.CheckAdminStatusAsync();
        if (status.Success && status.Data)
        {
            IsLoggedIn = true;
            await RefreshAllAsync();
        }
        else
        {
            AdminPasswordBox.Focus();
        }
    }

    private async Task RefreshAllAsync()
    {
        await RunSafelyAsync(async () =>
        {
            await Task.WhenAll(
                LoadStatsAsync(),
                LoadMessagesAsync(),
                LoadUsersAsync(SelectedUserFilter),
                LoadRentalsAsync(),
                LoadCarsAsync());

            ShowStatus("Adatok frissítve.");
        });
    }

    private async Task LoadStatsAsync()
    {
        var result = await _apiService.GetStatsAsync();
        if (result.Success && result.Data != null)
        {
            Stats = result.Data;
        }
        else if (!result.Success)
        {
            ShowStatus(result.Message ?? "Nem sikerült a statisztikákat betölteni.", true);
        }
    }

    private async Task LoadMessagesAsync()
    {
        var result = await _apiService.GetMessagesAsync();
        if (result.Success)
        {
            ReplaceCollection(Messages, result.Data);
        }
        else
        {
            ShowStatus(result.Message ?? "Nem sikerült az üzeneteket betölteni.", true);
        }
    }

    private async Task LoadUsersAsync(string? filter = null)
    {
        var result = await _apiService.GetUsersAsync(filter ?? SelectedUserFilter);
        if (result.Success)
        {
            ReplaceCollection(Users, result.Data);
        }
        else
        {
            ShowStatus(result.Message ?? "Nem sikerült a felhasználókat betölteni.", true);
        }
    }

    private async Task LoadRentalsAsync()
    {
        var result = await _apiService.GetRentalsAsync();
        if (result.Success)
        {
            ReplaceCollection(Rentals, result.Data);
        }
        else
        {
            ShowStatus(result.Message ?? "Nem sikerült a bérléseket betölteni.", true);
        }
    }

    private async Task LoadCarsAsync()
    {
        var result = await _apiService.GetCarsAsync();
        if (result.Success)
        {
            ReplaceCollection(Cars, result.Data);
        }
        else
        {
            ShowStatus(result.Message ?? "Nem sikerült az autókat betölteni.", true);
        }
    }

    private void ReplaceCollection<T>(ObservableCollection<T> collection, IEnumerable<T>? items)
    {
        collection.Clear();
        if (items == null) return;
        foreach (var item in items)
        {
            collection.Add(item);
        }
    }

    private async Task RunSafelyAsync(Func<Task> action, bool useBusyIndicator = true)
    {
        try
        {
            if (useBusyIndicator)
            {
                IsBusy = true;
            }

            await action();
        }
        catch (Exception ex)
        {
            ShowStatus(ex.Message, true);
        }
        finally
        {
            if (useBusyIndicator)
            {
                IsBusy = false;
            }
        }
    }

    private void ShowStatus(string message, bool isError = false)
    {
        StatusMessage = message;
        StatusIsError = isError;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e) => Close();

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        var password = AdminPasswordBox.Password;
        LoginErrorText.Visibility = Visibility.Collapsed;

        if (string.IsNullOrWhiteSpace(password))
        {
            LoginErrorText.Text = "A jelszó megadása kötelező.";
            LoginErrorText.Visibility = Visibility.Visible;
            return;
        }

        await RunSafelyAsync(async () =>
        {
            var result = await _apiService.LoginAsync(password);
            if (!result.Success)
            {
                LoginErrorText.Text = result.Message ?? "Bejelentkezés sikertelen.";
                LoginErrorText.Visibility = Visibility.Visible;
                return;
            }

            IsLoggedIn = true;
            AdminPasswordBox.Password = string.Empty;
            LoginErrorText.Visibility = Visibility.Collapsed;
            await RefreshAllAsync();
        });
    }

    private async void LogoutButton_Click(object sender, RoutedEventArgs e)
    {
        await RunSafelyAsync(async () =>
        {
            await _apiService.LogoutAsync();
            IsLoggedIn = false;
            AdminPasswordBox.Password = string.Empty;
            ShowStatus("Sikeresen kijelentkezett.");
            AdminPasswordBox.Focus();
        }, useBusyIndicator: false);
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e) => await RefreshAllAsync();

    private async void RefreshMessagesButton_Click(object sender, RoutedEventArgs e) =>
        await RunSafelyAsync(LoadMessagesAsync);

    private async void RefreshUsersButton_Click(object sender, RoutedEventArgs e) =>
        await RunSafelyAsync(() => LoadUsersAsync(SelectedUserFilter));

    private async void RefreshRentalsButton_Click(object sender, RoutedEventArgs e) =>
        await RunSafelyAsync(LoadRentalsAsync);

    private async void RefreshCarsButton_Click(object sender, RoutedEventArgs e) =>
        await RunSafelyAsync(LoadCarsAsync);

    private async void MarkMessageRead_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement element && element.DataContext is ContactMessage message)
        {
            await RunSafelyAsync(async () =>
            {
                var result = await _apiService.UpdateMessageStatusAsync(message.Id, "read");
                if (result.Success)
                {
                    await LoadMessagesAsync();
                    ShowStatus("Üzenet olvasottnak jelölve.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült frissíteni az üzenetet.", true);
                }
            });
        }
    }

    private async void DeleteMessage_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement element && element.DataContext is ContactMessage message)
        {
            var confirm = MessageBox.Show("Biztosan törli az üzenetet?", "Megerősítés", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (confirm != MessageBoxResult.Yes) return;

            await RunSafelyAsync(async () =>
            {
                var result = await _apiService.DeleteMessageAsync(message.Id);
                if (result.Success)
                {
                    await LoadMessagesAsync();
                    ShowStatus("Üzenet törölve.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült törölni az üzenetet.", true);
                }
            });
        }
    }

    private async void UserFilterCombo_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (!IsLoggedIn)
        {
            return;
        }

        if (UserFilterCombo.SelectedValue is string filter)
        {
            SelectedUserFilter = filter;
            await RunSafelyAsync(() => LoadUsersAsync(filter));
        }
    }

    private async void EditUserButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedUser == null)
        {
            MessageBox.Show("Válasszon ki egy felhasználót.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var dialog = new UserEditWindow(SelectedUser) { Owner = this };
        if (dialog.ShowDialog() == true && dialog.Result != null)
        {
            await RunSafelyAsync(async () =>
            {
                var result = await _apiService.UpdateUserAsync(SelectedUser.Id, dialog.Result);
                if (result.Success)
                {
                    await LoadUsersAsync(SelectedUserFilter);
                    ShowStatus("Felhasználó sikeresen frissítve.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült frissíteni a felhasználót.", true);
                }
            });
        }
    }

    private async void DeleteUserButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedUser == null)
        {
            MessageBox.Show("Válasszon ki egy felhasználót.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var confirm = MessageBox.Show($"Biztosan törli {SelectedUser.Name} felhasználót?",
            "Megerősítés",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (confirm != MessageBoxResult.Yes) return;

        await RunSafelyAsync(async () =>
        {
            var result = await _apiService.DeleteUserAsync(SelectedUser.Id);
            if (result.Success)
            {
                await LoadUsersAsync(SelectedUserFilter);
                ShowStatus("Felhasználó törölve.");
            }
            else
            {
                ShowStatus(result.Message ?? "Nem sikerült törölni a felhasználót.", true);
            }
        });
    }

    private async void SendEmailButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedUser == null)
        {
            MessageBox.Show("Válasszon ki egy felhasználót.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var dialog = new EmailWindow(SelectedUser.Name ?? string.Empty, SelectedUser.Email ?? string.Empty) { Owner = this };
        if (dialog.ShowDialog() == true && dialog.Result != null)
        {
            await RunSafelyAsync(async () =>
            {
                var result = await _apiService.SendEmailAsync(dialog.Result);
                if (result.Success)
                {
                    ShowStatus("Email sikeresen elküldve.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült elküldeni az emailt.", true);
                }
            }, useBusyIndicator: false);
        }
    }

    private async void ApproveRentalButton_Click(object sender, RoutedEventArgs e) =>
        await UpdateRentalStatusAsync("confirmed");

    private async void RejectRentalButton_Click(object sender, RoutedEventArgs e) =>
        await UpdateRentalStatusAsync("cancelled");

    private async void DeleteRentalButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedRental == null)
        {
            MessageBox.Show("Válasszon ki egy bérlést.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var confirm = MessageBox.Show("Biztosan törli a bérlést?", "Megerősítés", MessageBoxButton.YesNo, MessageBoxImage.Warning);
        if (confirm != MessageBoxResult.Yes) return;

        await RunSafelyAsync(async () =>
        {
            var result = await _apiService.DeleteRentalAsync(SelectedRental.Id);
            if (result.Success)
            {
                await LoadRentalsAsync();
                ShowStatus("Bérlés törölve.");
            }
            else
            {
                ShowStatus(result.Message ?? "Nem sikerült törölni a bérlést.", true);
            }
        });
    }

    private async Task UpdateRentalStatusAsync(string status)
    {
        if (SelectedRental == null)
        {
            MessageBox.Show("Válasszon ki egy bérlést.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        await RunSafelyAsync(async () =>
        {
            var result = await _apiService.UpdateRentalStatusAsync(SelectedRental.Id, status);
            if (result.Success)
            {
                await LoadRentalsAsync();
                ShowStatus("Bérlés státusza frissítve.");
            }
            else
            {
                ShowStatus(result.Message ?? "Nem sikerült frissíteni a bérlést.", true);
            }
        });
    }

    private async void AddCarButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new CarEditorWindow(null) { Owner = this };
        if (dialog.ShowDialog() == true && dialog.Result != null)
        {
            await RunSafelyAsync(async () =>
            {
                var result = await _apiService.CreateCarAsync(dialog.Result);
                if (result.Success)
                {
                    await LoadCarsAsync();
                    ShowStatus("Új autó hozzáadva.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült az autó hozzáadása.", true);
                }
            });
        }
    }

    private async void EditCarButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedCar == null)
        {
            MessageBox.Show("Válasszon ki egy autót.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var dialog = new CarEditorWindow(SelectedCar) { Owner = this };
        if (dialog.ShowDialog() == true && dialog.Result != null)
        {
            await RunSafelyAsync(async () =>
            {
                dialog.Result.Id = SelectedCar.Id;
                var result = await _apiService.UpdateCarAsync(dialog.Result);
                if (result.Success)
                {
                    await LoadCarsAsync();
                    ShowStatus("Autó frissítve.");
                }
                else
                {
                    ShowStatus(result.Message ?? "Nem sikerült frissíteni az autót.", true);
                }
            });
        }
    }

    private async void DeleteCarButton_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedCar == null)
        {
            MessageBox.Show("Válasszon ki egy autót.", "Figyelmeztetés", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var confirm = MessageBox.Show($"Biztosan törli a(z) {SelectedCar.Name} autót?",
            "Megerősítés",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (confirm != MessageBoxResult.Yes) return;

        await RunSafelyAsync(async () =>
        {
            var result = await _apiService.DeleteCarAsync(SelectedCar.Id);
            if (result.Success)
            {
                await LoadCarsAsync();
                ShowStatus("Autó törölve.");
            }
            else
            {
                ShowStatus(result.Message ?? "Nem sikerült törölni az autót.", true);
            }
        });
    }

    protected bool SetField<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
        {
            return false;
        }

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        return true;
    }
}