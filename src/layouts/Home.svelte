<script>

    import {Link} from "svelte-routing";
    import {onMount} from "svelte";
    import {host_address} from "../store.js";
    import Button from "../components/Button.svelte";
    import FrontSlider from "../components/HomeSlider.svelte"
    import CatalogButton from "../components/CatalogButton.svelte";
    import { addToCart } from "../cartStore.js";

    let cosmetic = [];
    let supplements = [];



    let msg = "";

   async function fetchItems(type) {

       const baseURL = $host_address+`/items-by-type/${type}`;

       try {
           const response = await fetch(baseURL);

           if (!response.ok) {
               throw new Error(`Error fetching category ${type}: ${response.statusText}`);
           }
           const data = await response.json();
           return data;
       } catch (e) {
           console.error(e)
       }

    }

    onMount(async () => {
        cosmetic = await fetchItems("Косметика");
        supplements = await fetchItems("Добавки");
    });







</script>




<div class="flex flex-col justify-center mt-14 align-baseline items-center h-14
 bg-primary shadow-md shadow-primary-400
 border-t border-b-white">
    <h1 class="font-bold text-white uppercase tracking-wide subpixel-antialiased">GoMarket</h1>
</div>

<FrontSlider/>

<section class="flex flex-col">
    <div class="flex items-center justify-center w-full
            h-14 bg-primary shadow-md shadow-primary-400
            uppercase font-bold text-white z-30 sticky top-10 lg:w-1/2 lg:self-center">
    <h2>Косметика</h2>
    </div>

<div class="grid grid-cols-2 gap-4 mt-4 p-4 lg:w-1/2 lg:self-center">
    {#each cosmetic as item (item.Id)}
        <div class="flex flex-wrap justify-center items-center bg-slate-50 rounded-xl p-4 flex-col shadow-sm transition transform hover:-translate-y-1 hover:shadow-md">
            <Link class="flex bg-blend-multiply justify-center items-center" to="/item/{item.Id}">
                <img class="object-contain h-44 w-full md:h-96 lg:h-96" src="/static/{item.Images}" alt="{item.Name}">
            </Link>
            <div class="flex flex-col pl-2 pr-2">
                <Link to="/item/{item.Id}" class="line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary">
                    {item.Name}
                </Link>
                <div class="flex flex-col justify-between mt-3 mb-3">
                    <span class="text-green-500 text-l">{#if item.IsStock}В наличии{/if}{#if !item.IsStock}Закончился{/if}</span>
                    <span class="font-extrabold text-lg text-slate-700">{item.Price}₴</span>
                </div>
                <Button on:click={() => addToCart(item)} icon="add_shopping_cart" name="" width="w-1/3" />
            </div>
        </div>
    {/each}
    </div>



    <CatalogButton path="/catalog" name="Каталог" />


</section>

<section class="flex flex-col">
    <div class="flex items-center justify-center w-full
            h-14 bg-primary shadow-md shadow-primary-400
            uppercase font-bold text-white z-30 sticky top-10 lg:w-1/2 lg:self-center">
    <h2>Биодобавки</h2>
</div>



<div class="grid grid-cols-2 gap-4 mt-4 p-4 lg:w-1/2 lg:self-center">
    {#each supplements as item (item.Id)}
        <div class="flex flex-wrap justify-center items-center bg-slate-50 rounded-xl p-4 flex-col shadow-sm transition transform hover:-translate-y-1 hover:shadow-md">
            <Link class="flex bg-blend-multiply justify-center items-center" to="/item/{item.Id}">
                <img class="object-contain h-44 w-full md:h-96 lg:h-96" src="/static/{item.Images}" alt="{item.Name}">
            </Link>
            <div class="flex flex-col pl-2 pr-2">
                <Link to="/item/{item.Id}" class="line-clamp-2 min-h-10 capitalize font-bold text-slate-600 text-sm mt-4 transition transform hover:text-primary">
                    {item.Name}
                </Link>
                <div class="flex flex-col justify-between mt-3 mb-3">
                    <span class="text-green-500 text-l">{#if item.IsStock}В наличии{/if}{#if !item.IsStock}Закончился{/if}</span>
                    <span class="font-extrabold text-lg text-slate-700">{item.Price}₴</span>
                </div>
                <Button on:click={() => addToCart(item)} icon="add_shopping_cart" name="" width="w-1/3" />
            </div>
        </div>
    {/each}
    </div>
    <CatalogButton path="/catalog" name="Каталог" />
</section>





   


