using System;
using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using CarGo.AdminClient.Models;
using Microsoft.Win32;

namespace CarGo.AdminClient.Views;

public partial class CarEditorWindow : Window
{
    private readonly Car? _car;
    public CarUpsertRequest? Result { get; private set; }

    public CarEditorWindow(Car? car)
    {
        InitializeComponent();
        _car = car;
        InitializeFields();
    }

    private void InitializeFields()
    {
        if (_car == null)
        {
            CategoryCombo.SelectedIndex = 0;
            TransmissionCombo.SelectedIndex = 0;
            FuelCombo.SelectedIndex = 0;
            SeatsTextBox.Text = "5";
            return;
        }

        Title = $"Autó szerkesztése - {_car.Name}";
        NameTextBox.Text = _car.Name ?? string.Empty;
        DescriptionTextBox.Text = _car.Description ?? string.Empty;
        PriceTextBox.Text = _car.PricePerDay.ToString(CultureInfo.InvariantCulture);
        SeatsTextBox.Text = _car.Seats.ToString(CultureInfo.InvariantCulture);

        SelectComboItem(CategoryCombo, _car.Category);
        SelectComboItem(TransmissionCombo, _car.Transmission);
        SelectComboItem(FuelCombo, _car.FuelType);

        if (!string.IsNullOrWhiteSpace(_car.ImageUrl) && Uri.TryCreate(_car.ImageUrl, UriKind.RelativeOrAbsolute, out var uri))
        {
            try
            {
                ImagePreview.Source = new BitmapImage(uri);
            }
            catch
            {
                // ignore preview failures for remote images
            }
        }
    }

    private static void SelectComboItem(ComboBox comboBox, string? value)
    {
        if (value == null)
        {
            comboBox.SelectedIndex = 0;
            return;
        }

        foreach (var item in comboBox.Items)
        {
            if (item is ComboBoxItem comboItem &&
                string.Equals(comboItem.Content?.ToString(), value, StringComparison.OrdinalIgnoreCase))
            {
                comboBox.SelectedItem = comboItem;
                return;
            }
        }

        comboBox.SelectedIndex = 0;
    }

    private void BrowseButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Képfájlok (*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp)|*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp"
        };

        if (dialog.ShowDialog() == true)
        {
            ImagePathTextBox.Text = dialog.FileName;
            LoadPreview(dialog.FileName);
        }
    }

    private void LoadPreview(string path)
    {
        if (!File.Exists(path))
        {
            ImagePreview.Source = null;
            return;
        }

        try
        {
            var bitmap = new BitmapImage();
            bitmap.BeginInit();
            bitmap.CacheOption = BitmapCacheOption.OnLoad;
            bitmap.UriSource = new Uri(path);
            bitmap.EndInit();
            ImagePreview.Source = bitmap;
        }
        catch
        {
            ImagePreview.Source = null;
        }
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        var name = NameTextBox.Text?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            MessageBox.Show("Az autó neve kötelező.", "Hiba", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (!decimal.TryParse(PriceTextBox.Text, NumberStyles.Any, CultureInfo.InvariantCulture, out var price))
        {
            MessageBox.Show("Érvényes ár szükséges.", "Hiba", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        if (!int.TryParse(SeatsTextBox.Text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seats))
        {
            MessageBox.Show("Érvényes ülésszám szükséges.", "Hiba", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var category = (CategoryCombo.SelectedItem as ComboBoxItem)?.Content?.ToString();
        var transmission = (TransmissionCombo.SelectedItem as ComboBoxItem)?.Content?.ToString();
        var fuel = (FuelCombo.SelectedItem as ComboBoxItem)?.Content?.ToString();

        Result = new CarUpsertRequest
        {
            Name = name,
            Description = DescriptionTextBox.Text,
            PricePerDay = price,
            Category = category,
            Transmission = transmission,
            FuelType = fuel,
            Seats = seats,
            ImagePath = string.IsNullOrWhiteSpace(ImagePathTextBox.Text) ? null : ImagePathTextBox.Text
        };

        DialogResult = true;
        Close();
    }
}

