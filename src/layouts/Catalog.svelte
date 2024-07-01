
<script>
    import {host_address, isOpenStore, toggleSideBar} from "../store.js";
    import {Link} from "svelte-routing";
    import {onDestroy, onMount} from "svelte";
    import Button from "../components/Button.svelte";
    import { writable} from "svelte/store";
    import FilterWindow from "../components/FilterWindow.svelte";
    import currentPrice from "../components/FilterWindow.svelte"
    import { modals, closeModal, openModal } from "../modalsStore.js";
    import { addToCart } from "../cartStore.js";

    export let category = "";

    let page = writable(1);
    let currentPage = $page;
    let brand = [];
    
    let  cp = currentPrice;

    let isLoading = writable(false);
    let loadMore = true;
    let products = [];
    let categories = [];
    let minPrice = 400;
    let maxPrice = 2900;
    let productForm;

    let sentinel;
    let isOpenLocal = false;


   
    


    //Fetching categories
    async function fetchCategoryList() {

        const query = $host_address + "/get-category-list";
        try {
            const response = await fetch(query);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();

        } catch(e) {
            console.error(e);
        }

    }

    async function fetchMinMaxPrice() {

        const query = $host_address + "/get-min-max";

        try {

            const response = await fetch(query);
            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();

            minPrice = data.minPrice;
            maxPrice = data.maxPrice;

        } catch (e) {
            console.error(e);
        }

    }

     async function fetchBrandList() {

        const query = $host_address + "/get-brand-list";
        try {
            const response = await fetch(query);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();

        } catch(e) {
            console.error(e);
        }

    }

    async function fetchFormList() {
        const query = $host_address + "/get-subsection-list";

        try {

            const response = await fetch(query);
            if(!response.ok) {
                throw new Error(response.statusText);
            }

            return response.json();

        } catch(e) {
            console.error(e);
        }
    }

    //Fetching main items
    async function fetchItems() {
        const currentPage = $page;
        if (!loadMore || $isLoading) return;
        isLoading.set(true);

        const response = await fetch(`${$host_address}/items-by-category?page=${currentPage}&category=${category}`);
        if (!response.ok) {
            console.error('Failed to fetch items');
            isLoading.set(false);
            return;
        }

        const newProducts = await response.json();
        if (newProducts && newProducts.length > 0) {
            products = [...products, ...newProducts];
            page.update(n => n + 1);
        } else {
            loadMore = false;
        }
        isLoading.set(false);
    }

    function observe() {

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !$isLoading && loadMore) {
                fetchItems();
            }
        });
        observer.observe(sentinel);

        return () => observer.disconnect();
    }

    function goBack() {

        if(window.history.length > 1) {
            window.history.back();
        }
        else {
            window.location.href = '/';
        }
        
    }

    console.log("Brand:", brand)

    onMount(observe);
    onMount(async () => {
        categories = await fetchCategoryList();
        brand = await fetchBrandList();
        productForm = await fetchFormList();
        await fetchMinMaxPrice();

    });

    const unsubscribe = isOpenStore.subscribe(value => {
        isOpenLocal = value;
    })

    onDestroy(() => {
        unsubscribe();
    });


    


   


</script>

{#if $modals.modal1}
 <!-- Backdrop -->
 
    <FilterWindow {brand}{productForm}{minPrice}{maxPrice}/>
 {/if}






<section class="flex flex-col box-border w-screen relative top-14 p-4 lg:w-1/2 lg:self-center">
    <div class="flex justify-between">
        <h2 class="font-bold text-2xl mb-4">Каталог</h2>
    </div>

    <div class="grid grid-cols-2 gap-4">
        {#each categories as item}
            <Link to={`/items-by-category/${item.Name}/${currentPage}`} replace
                  class="flex items-center h-14 p-2 border border-slate-200 rounded-lg shadow-sm transition transform hover:-translate-y-1 hover:shadow-md hover:bg-light">
                <span class="flex flex-shrink-0 w-10 h-10">
                    <img src="/static/public/images/products/{item.Image}" class="object-contain" alt="">
                </span>
                <span class="text-sm ml-2">{item.Name}</span>
            </Link>
        {/each}
    </div>

    <div class="flex flex-col">
        <div class="flex justify-between items-center mt-6">
            <Button on:click={() => openModal('modal1')} icon="filter_list" name="" width="w-1/3" fontSize="text-sm" color="bg-primary"/>
            <form class="inline-flex justify-center items-center w-1/3 h-10">
                <select class="flex text-sm font-bold bg-primary w-full h-full text-center text-white rounded">
                    <option value="">Цена</option>
                    <option value="2">Дорогие</option>
                    <option value="1">Дешевые</option>
                </select>
            </form>
        </div>

        <div class="grid grid-cols-2 gap-4 mt-8">
            {#each products as item (item.Id)}
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
            <div bind:this={sentinel} class="h-2"></div>
        </div>
    </div>
</section>
