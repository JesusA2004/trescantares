<template>
    <div class="w-full overflow-hidden">
        <!-- Línea verde -->
        <div class="h-2 bg-tc-verde w-full"></div>
        <!-- Línea roja con patrón -->
        <div class="h-3 bg-tc-rojo w-full relative flex items-center justify-center overflow-hidden">
            <div class="flex gap-1 absolute">
                <span v-for="i in 80" :key="i"
                    class="inline-block w-2 h-2 rounded-full bg-white/30"></span>
            </div>
        </div>
    </div>
</template>
