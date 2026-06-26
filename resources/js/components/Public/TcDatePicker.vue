<script setup lang="ts">
import { computed } from 'vue';
import {
    DatePickerRoot, DatePickerTrigger, DatePickerContent, DatePickerCalendar,
    DatePickerGrid, DatePickerGridHead, DatePickerGridRow, DatePickerHeadCell,
    DatePickerGridBody, DatePickerCell, DatePickerCellTrigger,
    DatePickerHeader, DatePickerHeading, DatePickerNext, DatePickerPrev,
} from 'reka-ui';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next';

const props = defineProps<{
    modelValue?: string;
    placeholder?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const dateValue = computed(() => {
    if (!props.modelValue) return undefined;
    const parts = props.modelValue.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return undefined;
    return new CalendarDate(parts[0], parts[1], parts[2]);
});

function onUpdate(val: any) {
    if (!val) { emit('update:modelValue', ''); return; }
    const m = String(val.month).padStart(2, '0');
    const d = String(val.day).padStart(2, '0');
    emit('update:modelValue', `${val.year}-${m}-${d}`);
}

const displayValue = computed(() => {
    if (!props.modelValue) return '';
    const parts = props.modelValue.split('-').map(Number);
    if (parts.length !== 3) return '';
    return `${parts[2]} de ${MONTHS_ES[parts[1] - 1]} de ${parts[0]}`;
});
</script>

<template>
    <DatePickerRoot
        :model-value="dateValue"
        @update:model-value="onUpdate"
        locale="es-MX"
        :max-value="today(getLocalTimeZone())"
    >
        <!-- Trigger button — mismo estilo que inputs -->
        <DatePickerTrigger as-child>
            <button type="button" class="tc-jobs-input tc-datepicker-trigger font-body">
                <CalendarIcon class="tc-datepicker-icon" />
                <span :class="displayValue ? 'tc-datepicker-val' : 'tc-datepicker-ph'">
                    {{ displayValue || (placeholder ?? 'Selecciona tu fecha de nacimiento') }}
                </span>
            </button>
        </DatePickerTrigger>

        <!-- Calendar popup -->
        <DatePickerContent class="tc-datepicker-content">
            <DatePickerCalendar v-slot="{ weekDays, grid }">
                <DatePickerHeader class="tc-datepicker-header">
                    <DatePickerPrev class="tc-datepicker-nav">
                        <ChevronLeftIcon :size="16" />
                    </DatePickerPrev>
                    <DatePickerHeading class="tc-datepicker-heading font-display" />
                    <DatePickerNext class="tc-datepicker-nav">
                        <ChevronRightIcon :size="16" />
                    </DatePickerNext>
                </DatePickerHeader>

                <DatePickerGrid v-for="month in grid" :key="month.value.toString()">
                    <DatePickerGridHead>
                        <DatePickerGridRow class="tc-datepicker-weekrow">
                            <DatePickerHeadCell
                                v-for="day in weekDays" :key="day"
                                class="tc-datepicker-headcell font-body"
                            >{{ day }}</DatePickerHeadCell>
                        </DatePickerGridRow>
                    </DatePickerGridHead>

                    <DatePickerGridBody>
                        <DatePickerGridRow
                            v-for="(week, i) in month.rows" :key="i"
                            class="tc-datepicker-weekrow"
                        >
                            <DatePickerCell
                                v-for="day in week" :key="day.toString()"
                                :date="day"
                                class="tc-datepicker-cell"
                            >
                                <DatePickerCellTrigger
                                    :day="day" :month="month.value"
                                    class="tc-datepicker-day font-body"
                                />
                            </DatePickerCell>
                        </DatePickerGridRow>
                    </DatePickerGridBody>
                </DatePickerGrid>
            </DatePickerCalendar>
        </DatePickerContent>
    </DatePickerRoot>
</template>
