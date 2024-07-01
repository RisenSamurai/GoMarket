<script>
  import CloseButton from "./CloseButton.svelte";
  import {toggleSideBar} from "../store.js";
  import Button from "./Button.svelte";
  import { fly } from "svelte/transition";
  import { modals, closeModal } from "../modalsStore";



    export let brand = [];
    export let productForm = [];
    export let minPrice;
    export let maxPrice;

    export let currentPrice = maxPrice;


</script>


<button on:click={() => closeModal('modal1')} class="flex fixed z-10 bg-white/30
 backdrop-blur w-screen h-screen"></button>
<div in:fly={{x: -300, duration: 500}} out:fly={{x: -300, duration: 500}}
     class="flex flex-col h-screen w-2/3 fixed top-14 p-4 bg-white z-30 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/3">

    <form method="POST" class="overflow-auto">
        <div class="flex flex-col overflow-auto">
            <h3 class="font-bold text-xl mb-4 mt-4">Бренды</h3>
            {#each brand as item}
                <div class="flex items-center w-full">
                    <label class="flex justify-between w-full mb-1 hover:bg-light p-2 rounded" for="{item}">
                        <span>{item}</span>
                        <input type="checkbox" name="option" value="{item}" id="{item}">
                    </label>
                </div>
            {/each}

            <div class="flex flex-col">
                <h3 class="font-bold text-xl mb-4 mt-4">Цена</h3>
                <fieldset class="flex flex-col">
                    <div class="flex justify-between">
                        <div class="flex justify-center">
                            <input class="inline-flex w-1/3 border border-slate-300 rounded-xl p-2"
                                   type="text" name="minPrice" value={minPrice} disabled>
                            <span class="flex justify-center items-center pl-2 pr-2">-</span>
                            <input class="inline-flex w-1/3 border border-slate-300 rounded-xl p-2"
                                   type="text" name="maxPrice" value={currentPrice} disabled>
                        </div>
                    </div>
                    <input class="flex mb-4 w-full mt-4 cursor-pointer" bind:value={currentPrice}
                           type="range" name="priceRange" min={minPrice} max={maxPrice} step="1">
                    <Button name="Показать" color="bg-primary hover:bg-primary-dark transition-colors duration-200"/>
                </fieldset>
            </div>

            <div class="flex flex-col">
                <h3 class="font-bold text-xl mb-4 mt-4">Форма</h3>
                {#each productForm as item}
                    <div class="flex items-center justify-between w-full">
                        <label class="flex justify-between w-full mb-1 hover:bg-light p-2 rounded" for="{item}">
                            <span>{item}</span>
                            <input type="checkbox" name="option" value="{item}" id="{item}">
                        </label>
                    </div>
                {/each}
            </div>
        </div>
    </form>
</div>
