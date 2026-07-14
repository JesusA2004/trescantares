<?php

namespace Database\Factories;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class MenuItemFactory extends Factory
{
    protected $model = MenuItem::class;

    public function definition(): array
    {
        return [
            'menu_category_id' => MenuCategory::factory(),
            'name' => ucfirst($this->faker->unique()->words(3, true)),
            'description' => $this->faker->sentence(),
            'price' => $this->faker->randomFloat(2, 30, 300),
            'sort_order' => $this->faker->numberBetween(1, 20),
            'is_featured' => false,
            'is_active' => true,
        ];
    }
}
