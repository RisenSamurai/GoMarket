<script>
    import {Router, Link, Route} from "svelte-routing";
    export let name = "Button";
    export let path = "/catalog";

</script>



<Link class="flex justify-center items-center cursor-pointer rounded-3xl w-11/12  font-bold
text-white self-center pr-4 pl-4 mb-5 mt-6 h-12 bg-primary md:w-2/3 lg:w-1/2" to="{path}">
    <i class="flex items-center justify-center material-icons text-white mr-1 text-lg">menu_book</i>
    <span class="flex items-center justify-center text-lg">{name}</span>
</Link>

