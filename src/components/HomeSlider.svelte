
<script>

    import {onMount, onDestroy} from 'svelte';

    let interval;
    let delay = 5000;
    let images = [
        '/static/public/images/slider/slide0.webp',
        '/static/public/images/slider/slide2.webp',
        '/static/public/images/slider/slide1.webp',
    ]

    let currentIndex = 0;

    function goToNext() {
        currentIndex = (currentIndex + 1) % images.length;
    }

    onMount(() => {
        interval = setInterval(goToNext, delay);
    })

    onDestroy(() => {

        clearInterval(interval);

    })



</script>

<div class="flex w-full  mt-2 mb-2 p-1.5 lg:w-1/2 lg:self-center">
    <div class="flex justify-center rounded-xl items-center w-full overflow-hidden">
        <img class="object-contain" src="{images[currentIndex]}" alt="{images[currentIndex]}">
    </div>
</div>