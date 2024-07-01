<script>
    export let icon = "";
    export let name = "Button";
    export let width = "";
    export let fontSize = "text-base";
    export let height = "h-10";
    export let md = "0";
    export let color = "bg-secondary";

    if(md == "1") {
        width = "w-1/2 md:w-full";
    }

</script>

<button on:click class="inline-flex justify-center items-center align-baseline text-center
             font-bold {fontSize} {height} {width}  {color}
             text-white rounded
              hover:-translate-y-1 hover:shadow-md hover:bg-blue-400">
    <i class="flex justify-center items-center material-icons">{icon}</i>
    <span>{name}</span>
</button>