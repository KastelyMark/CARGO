import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css']
})
export class VerifyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('input0') input0!: ElementRef<HTMLInputElement>;
  @ViewChild('input1') input1!: ElementRef<HTMLInputElement>;
  @ViewChild('input2') input2!: ElementRef<HTMLInputElement>;
  @ViewChild('input3') input3!: ElementRef<HTMLInputElement>;
  @ViewChild('input4') input4!: ElementRef<HTMLInputElement>;
  @ViewChild('input5') input5!: ElementRef<HTMLInputElement>;

  codeDigits = ['', '', '', '', '', ''];
  isSubmitting = false;
  isResending = false;
  resendCooldown = 0;
  showMessage = false;
  messageText = '';
  messageType = '';
  showSuccessModal = false;
  verificationEmail = '';

  private inputs: ElementRef<HTMLInputElement>[] = [];
  private sub?: Subscription;
  private cooldownInterval?: ReturnType<typeof setInterval>;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.verificationEmail = localStorage.getItem('verificationEmail') || '';
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.inputs = [this.input0, this.input1, this.input2, this.input3, this.input4, this.input5];
      setTimeout(() => this.input0?.nativeElement.focus(), 100);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 1) value = value.charAt(0);
    this.codeDigits[index] = value;
    input.value = value;
    this.cdr.detectChanges();
    if (value && index < 5) this.focusInput(index + 1);
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (this.codeDigits[index] === '' && index > 0) {
        this.focusInput(index - 1);
        this.codeDigits[index - 1] = '';
        this.updateInputValue(index - 1);
      } else {
        this.codeDigits[index] = '';
        this.updateInputValue(index);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.focusInput(index + 1);
    } else if (/^\d$/.test(event.key)) {
      this.codeDigits[index] = event.key;
      this.updateInputValue(index);
      if (index < 5) this.focusInput(index + 1);
      event.preventDefault();
    } else if (!/^(Backspace|ArrowLeft|ArrowRight|Tab|Delete)$/.test(event.key)) {
      event.preventDefault();
    }
    this.cdr.detectChanges();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    const digits = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.codeDigits[i] = digits[i] || '';
      this.updateInputValue(i);
    }
    this.focusInput(Math.min(digits.length, 5));
  }

  private updateInputValue(index: number): void {
    if (isPlatformBrowser(this.platformId) && this.inputs[index]) {
      this.inputs[index].nativeElement.value = this.codeDigits[index];
    }
  }

  private focusInput(index: number): void {
    if (isPlatformBrowser(this.platformId) && this.inputs[index]) {
      setTimeout(() => this.inputs[index].nativeElement.focus(), 0);
    }
  }

  isCodeComplete(): boolean {
    return this.codeDigits.every(d => /^\d$/.test(d));
  }

  get buttonDisabled(): boolean {
    return !this.isCodeComplete() || this.isSubmitting;
  }

  onSubmit(): void {
    if (this.isSubmitting || !this.isCodeComplete()) return;
    this.isSubmitting = true;
    const code = this.codeDigits.join('');

    this.sub = this.apiService.verify(code).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response?.success) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('pendingVerification');
            localStorage.removeItem('verificationEmail');
          }
          this.showSuccessModal = true;
        } else {
          this.showErrorMessage(response?.message || 'Érvénytelen hitelesítési kód.');
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.showErrorMessage(error.error?.message || 'Érvénytelen hitelesítési kód.');
      }
    });
  }

  resendCode(): void {
    if (this.isResending || this.resendCooldown > 0 || !this.verificationEmail) return;
    this.isResending = true;

    this.apiService.resendVerification(this.verificationEmail).subscribe({
      next: (response) => {
        this.isResending = false;
        if (response?.success) {
          this.showSuccessMessage('Új hitelesítési kód elküldve!');
          this.startCooldown();
          this.codeDigits = ['', '', '', '', '', ''];
          for (let i = 0; i < 6; i++) this.updateInputValue(i);
          this.focusInput(0);
        } else {
          this.showErrorMessage(response?.message || 'Hiba történt az újraküldés során.');
        }
      },
      error: (error: any) => {
        this.isResending = false;
        this.showErrorMessage(error.error?.message || 'Hiba történt az újraküldés során.');
      }
    });
  }

  private startCooldown(): void {
    this.resendCooldown = 60;
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      this.cdr.detectChanges();
      if (this.resendCooldown <= 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  private showSuccessMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'success';
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }

  private showErrorMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'error';
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }
}
