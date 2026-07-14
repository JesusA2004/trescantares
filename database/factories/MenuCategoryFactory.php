<?php

namespace Database\Factories;

use App\Models\MenuCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class MenuCategoryFactory extends Factory
{
    protected $model = MenuCategory::class;

    public function definition(): array
    {
        return [
            'name' => ucfirst($this->faker->unique()->words(2, true)),
            'description' => $this->faker->sentence(),
            'color' => $this->faker->hexColor(),
            'layout' => 'grid',
            'sort_order' => $this->faker->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
