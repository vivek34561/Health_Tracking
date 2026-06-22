import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { DietService, FoodRecord, DietGoal, NutritionSummary, RecommendationCategory } from '../../core/services/diet.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './diet.html',
  styleUrl: './diet.css'
})
export class DietComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dietService = inject(DietService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  @ViewChild('calorieChartCanvas') calorieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('proteinChartCanvas') proteinChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('macroChartCanvas') macroChartCanvas!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  // State Signals
  readonly activeTab = signal<'log' | 'history' | 'goals' | 'analytics' | 'recommendations'>('log');
  readonly todaySummary = signal<NutritionSummary | null>(null);
  readonly currentGoal = signal<DietGoal | null>(null);
  readonly foodsList = signal<FoodRecord[]>([]);
  readonly historyFoods = signal<FoodRecord[]>([]);
  readonly recommendations = signal<RecommendationCategory[]>([]);
  
  readonly searchResults = signal<any[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly isSearching = signal(false);
  
  // Date Filters
  readonly todayDate = new Date().toLocaleDateString('en-CA');
  readonly historyFilterDate = signal<string>(this.todayDate);
  readonly historySearchQuery = signal<string>('');

  // Food Logging Form
  readonly foodForm = this.fb.group({
    food_name: ['', [Validators.required, Validators.maxLength(100)]],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    unit: ['pieces', [Validators.required]],
    meal_type: ['BREAKFAST', [Validators.required]],
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
    fiber: [0, [Validators.required, Validators.min(0)]],
    created_at: [new Date().toISOString().substring(0, 16), [Validators.required]]
  });

  // Edit Mode State
  readonly isEditMode = signal(false);
  readonly editingRecordId = signal<number | null>(null);

  // Goal Calculator Form
  readonly goalForm = this.fb.group({
    goal_type: ['MAINTENANCE', [Validators.required]],
    age: [25, [Validators.required, Validators.min(1), Validators.max(120)]],
    gender: ['MALE', [Validators.required]],
    height: [170, [Validators.required, Validators.min(50), Validators.max(280)]],
    weight: [70, [Validators.required, Validators.min(20), Validators.max(500)]],
    activityLevel: ['MEDIUM', [Validators.required]],
    target_calories: [2000, [Validators.required, Validators.min(500)]],
    target_protein: [120, [Validators.required, Validators.min(0)]],
    target_carbs: [230, [Validators.required, Validators.min(0)]],
    target_fat: [65, [Validators.required, Validators.min(0)]]
  });

  // Meal history categorized mapping
  readonly mealsCategorized = computed(() => {
    const list = this.foodsList();
    const categories: Record<string, { list: FoodRecord[]; calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {
      BREAKFAST: { list: [], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      LUNCH: { list: [], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      DINNER: { list: [], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      SNACKS: { list: [], calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    };

    list.forEach(f => {
      const cat = f.meal_type.toUpperCase();
      if (categories[cat]) {
        categories[cat].list.push(f);
        categories[cat].calories += Number(f.calories);
        categories[cat].protein += Number(f.protein);
        categories[cat].carbs += Number(f.carbs);
        categories[cat].fat += Number(f.fat);
        categories[cat].fiber += Number(f.fiber);
      }
    });

    return categories;
  });

  // Filtered History list
  readonly filteredHistoryFoods = computed(() => {
    const list = this.historyFoods();
    const query = this.historySearchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter(f => f.food_name.toLowerCase().includes(query) || f.meal_type.toLowerCase().includes(query));
  });

  // Compute percentages for today's summary
  readonly macroPercentages = computed(() => {
    const summary = this.todaySummary();
    if (!summary) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const getPct = (c: number, t: number) => t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
    return {
      calories: getPct(summary.consumed.calories, summary.targets.calories),
      protein: getPct(summary.consumed.protein, summary.targets.protein),
      carbs: getPct(summary.consumed.carbs, summary.targets.carbs),
      fat: getPct(summary.consumed.fat, summary.targets.fat),
      fiber: getPct(summary.consumed.fiber, summary.targets.fiber)
    };
  });

  ngOnInit(): void {
    this.loadTodayData();
    this.loadDietGoals();
    this.setupAutocomplete();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  setTab(tab: 'log' | 'history' | 'goals' | 'analytics' | 'recommendations'): void {
    this.activeTab.set(tab);
    if (tab === 'log') {
      this.loadTodayData();
    } else if (tab === 'history') {
      this.loadHistoryData();
    } else if (tab === 'goals') {
      this.loadDietGoals();
    } else if (tab === 'recommendations') {
      this.loadRecommendations();
    } else if (tab === 'analytics') {
      setTimeout(() => this.initCharts(), 100);
    }
  }

  loadTodayData(): void {
    this.isLoading.set(true);
    this.dietService.getNutritionToday(this.todayDate).subscribe({
      next: (res) => {
        this.todaySummary.set(res);
        this.dietService.getFoods(this.todayDate).subscribe({
          next: (foods) => {
            this.foodsList.set(foods);
            this.isLoading.set(false);
          },
          error: () => {
            this.toastService.error('Failed to load today\'s logged meals.');
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.toastService.error('Failed to fetch today\'s nutritional summary.');
        this.isLoading.set(false);
      }
    });
  }

  loadHistoryData(): void {
    this.isLoading.set(true);
    this.dietService.getFoods(this.historyFilterDate()).subscribe({
      next: (res) => {
        this.historyFoods.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load history food logs.');
        this.isLoading.set(false);
      }
    });
  }

  loadDietGoals(): void {
    this.isLoading.set(true);
    this.dietService.getDietGoals().subscribe({
      next: (goal) => {
        this.currentGoal.set(goal);
        
        // Sync goalForm targets
        this.goalForm.patchValue({
          goal_type: goal.goal_type,
          target_calories: goal.target_calories,
          target_protein: goal.target_protein,
          target_carbs: goal.target_carbs,
          target_fat: goal.target_fat
        });

        // Autofill calculator demographics if available from auth profile
        const user = this.authService.currentUser();
        if (user) {
          this.goalForm.patchValue({
            age: user.age || 25,
            gender: (user.gender || 'MALE').toUpperCase(),
            height: user.height || 170,
            weight: user.weight || 70,
            activityLevel: (user.activityLevel || 'MEDIUM').toUpperCase()
          });
        }
        
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load diet goals.');
        this.isLoading.set(false);
      }
    });
  }

  loadRecommendations(): void {
    this.isLoading.set(true);
    this.dietService.getRecommendations().subscribe({
      next: (res) => {
        this.recommendations.set(res.recommendations);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load recommendations.');
        this.isLoading.set(false);
      }
    });
  }

  // --- Auto-Complete & Search Dictionary ---
  setupAutocomplete(): void {
    this.foodForm.get('food_name')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(val => {
        if (!val || val.trim().length < 2 || this.isEditMode()) {
          this.searchResults.set([]);
          return of([]);
        }
        this.isSearching.set(true);
        return this.dietService.searchDictionary(val);
      })
    ).subscribe({
      next: (matches) => {
        this.searchResults.set(matches);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      }
    });
  }

  selectSearchResult(item: any): void {
    this.foodForm.patchValue({
      food_name: item.name,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber
    });
    this.searchResults.set([]);
  }

  // Re-scale nutrients based on quantity modifications
  onQuantityChange(): void {
    const name = this.foodForm.value.food_name;
    const qty = parseFloat(this.foodForm.value.quantity as any);
    const unit = this.foodForm.value.unit;

    if (!name || isNaN(qty) || qty <= 0) return;

    this.dietService.searchDictionary(name).subscribe(matches => {
      const match = matches.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (match) {
        let factor = 1;
        if (match.unit.toLowerCase() === unit?.toLowerCase()) {
          factor = qty / match.quantity;
        } else {
          factor = qty;
        }

        this.foodForm.patchValue({
          calories: parseFloat((match.calories * factor).toFixed(1)),
          protein: parseFloat((match.protein * factor).toFixed(1)),
          carbs: parseFloat((match.carbs * factor).toFixed(1)),
          fat: parseFloat((match.fat * factor).toFixed(1)),
          fiber: parseFloat((match.fiber * factor).toFixed(1))
        });
      }
    });
  }

  // --- Actions ---
  onSubmitFood(): void {
    if (this.foodForm.invalid) {
      this.foodForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.foodForm.value;
    
    // Construct record payload
    const record: FoodRecord = {
      food_name: formVal.food_name!,
      quantity: parseFloat(formVal.quantity as any),
      unit: formVal.unit!,
      meal_type: formVal.meal_type!,
      calories: parseFloat(formVal.calories as any),
      protein: parseFloat(formVal.protein as any),
      carbs: parseFloat(formVal.carbs as any),
      fat: parseFloat(formVal.fat as any),
      fiber: parseFloat(formVal.fiber as any),
      created_at: new Date(formVal.created_at!).toISOString()
    };

    if (this.isEditMode() && this.editingRecordId()) {
      this.dietService.updateFood(this.editingRecordId()!, record).subscribe({
        next: () => {
          this.toastService.success('Food log updated successfully.');
          this.resetFoodForm();
          this.loadTodayData();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Failed to update food log.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.dietService.addFood(record).subscribe({
        next: () => {
          this.toastService.success('Food item logged successfully.');
          this.resetFoodForm();
          this.loadTodayData();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Failed to log food.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  editRecord(record: FoodRecord): void {
    this.isEditMode.set(true);
    this.editingRecordId.set(record.id || null);
    
    // Map record to form values
    const dateLocal = record.created_at ? new Date(record.created_at).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16);
    this.foodForm.patchValue({
      food_name: record.food_name,
      quantity: record.quantity,
      unit: record.unit,
      meal_type: record.meal_type,
      calories: record.calories,
      protein: record.protein,
      carbs: record.carbs,
      fat: record.fat,
      fiber: record.fiber,
      created_at: dateLocal
    });

    // Scroll up to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this food log entry?')) return;

    this.dietService.deleteFood(id).subscribe({
      next: () => {
        this.toastService.success('Food log entry deleted.');
        if (this.activeTab() === 'log') {
          this.loadTodayData();
        } else {
          this.loadHistoryData();
        }
      },
      error: () => {
        this.toastService.error('Failed to delete food log entry.');
      }
    });
  }

  resetFoodForm(): void {
    this.isEditMode.set(false);
    this.editingRecordId.set(null);
    this.foodForm.reset({
      food_name: '',
      quantity: 1,
      unit: 'pieces',
      meal_type: 'BREAKFAST',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      created_at: new Date().toISOString().substring(0, 16)
    });
    this.searchResults.set([]);
    this.isSubmitting.set(false);
  }

  // --- Goals Calculations (Mifflin-St Jeor on client side) ---
  calculateAndApplyGoals(): void {
    const val = this.goalForm.value;
    const age = parseInt(val.age as any, 10);
    const height = parseFloat(val.height as any);
    const weight = parseFloat(val.weight as any);
    const gender = val.gender!;
    const activity = val.activityLevel!;
    const goalType = val.goal_type!;

    if (isNaN(age) || isNaN(height) || isNaN(weight)) {
      this.toastService.error('Please input valid demographic details.');
      return;
    }

    // Mifflin-St Jeor Formula
    let bmr = 0;
    if (gender === 'MALE') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multiplier
    let mult = 1.375; // medium
    if (activity === 'LOW') mult = 1.2;
    if (activity === 'HIGH') mult = 1.725;

    const tdee = bmr * mult;

    let cal = tdee;
    let pPct = 25, cPct = 45, fPct = 30;

    if (goalType === 'WEIGHT_LOSS') {
      cal = tdee - 500;
      pPct = 30; cPct = 40; fPct = 30;
    } else if (goalType === 'WEIGHT_GAIN') {
      cal = tdee + 500;
      pPct = 20; cPct = 50; fPct = 30;
    } else if (goalType === 'MUSCLE_GAIN') {
      cal = tdee + 300;
      pPct = 35; cPct = 40; fPct = 25;
    }

    const finalCal = Math.max(1200, Math.round(cal));
    const finalP = Math.round((finalCal * (pPct / 100)) / 4);
    const finalC = Math.round((finalCal * (cPct / 100)) / 4);
    const finalF = Math.round((finalCal * (fPct / 100)) / 9);

    this.goalForm.patchValue({
      target_calories: finalCal,
      target_protein: finalP,
      target_carbs: finalC,
      target_fat: finalF
    });

    this.toastService.success('Macro recommendations calculated and filled!');
  }

  onSubmitGoals(): void {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.goalForm.value;
    const goal: DietGoal = {
      goal_type: val.goal_type!,
      target_calories: parseInt(val.target_calories as any, 10),
      target_protein: parseInt(val.target_protein as any, 10),
      target_carbs: parseInt(val.target_carbs as any, 10),
      target_fat: parseInt(val.target_fat as any, 10)
    };

    this.dietService.updateDietGoals(goal).subscribe({
      next: () => {
        this.toastService.success('Diet goals saved successfully.');
        this.isSubmitting.set(false);
        this.loadDietGoals();
      },
      error: () => {
        this.toastService.error('Failed to update diet goals.');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Visual Analytics Charts (Chart.js) ---
  private initCharts(): void {
    this.destroyCharts();

    this.isLoading.set(true);
    // Fetch last 7 days metrics
    this.dietService.getNutritionWeek().subscribe({
      next: (weekData) => {
        this.isLoading.set(false);
        if (!weekData || weekData.length === 0) return;

        // Parse labels and values
        const labels = weekData.map(w => {
          const d = new Date(w.date);
          return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        });
        const caloriesValues = weekData.map(w => parseFloat(w.calories));
        const proteinValues = weekData.map(w => parseFloat(w.protein));

        // 1. Calories Chart
        const calCanvas = this.calorieChartCanvas?.nativeElement;
        if (calCanvas) {
          const calChart = new Chart(calCanvas, {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: 'Calories (kcal)',
                data: caloriesValues,
                backgroundColor: 'rgba(66, 133, 244, 0.6)',
                borderColor: '#4285f4',
                borderWidth: 1,
                borderRadius: 4
              }]
            },
            options: this.getChartOptions('Calories Consumed per Day')
          });
          this.charts.push(calChart);
        }

        // 2. Protein Chart
        const protCanvas = this.proteinChartCanvas?.nativeElement;
        if (protCanvas) {
          const protChart = new Chart(protCanvas, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: 'Protein (g)',
                data: proteinValues,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
              }]
            },
            options: this.getChartOptions('Daily Protein Trend')
          });
          this.charts.push(protChart);
        }

        // 3. Macro Doughnut Chart for Today
        const macroCanvas = this.macroChartCanvas?.nativeElement;
        const summary = this.todaySummary();
        if (macroCanvas && summary && (summary.consumed.protein > 0 || summary.consumed.carbs > 0 || summary.consumed.fat > 0)) {
          const macroChart = new Chart(macroCanvas, {
            type: 'doughnut',
            data: {
              labels: ['Protein', 'Carbohydrates', 'Fat'],
              datasets: [{
                data: [summary.consumed.protein, summary.consumed.carbs, summary.consumed.fat],
                backgroundColor: [
                  '#e74c3c', // red
                  '#f1c40f', // yellow
                  '#2ecc71'  // green
                ],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    boxWidth: 12,
                    font: { size: 11, family: 'Inter' }
                  }
                }
              }
            }
          });
          this.charts.push(macroChart);
        }
      },
      error: () => {
        this.toastService.error('Failed to load chart metrics.');
        this.isLoading.set(false);
      }
    });
  }

  private getChartOptions(titleText: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: false },
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10, family: 'Inter' } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10, family: 'Inter' } }
        }
      }
    };
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }
}
