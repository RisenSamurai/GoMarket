<script>
    import { cartItems, increaseQuantity, decreaseQuantity, removeFromCart } from "../cartStore";
    import Button from "../components/Button.svelte"
    import { closeModal } from "../modalsStore";
    import { fly } from "svelte/transition";

    let total = 0;
    let delivery = 200;

    function toCheckOut() {
        window.location.href="/check-out";
    }

    $: total = $cartItems.reduce((sum, item) => sum + item.Price * item.quantity, 0)


</script>


<div in:fly={{y: -300, duration: 500}} out:fly={{y: -300, duration: 500}}
     class="flex flex-col h-screen w-full fixed p-4 bg-white z-50 shadow-md shadow-gray overflow-auto md:w-1/2 lg:w-1/3">

    <div class="flex justify-between items-center border-b border-slate-300 mb-4">
        <h2 class="font-bold text-xl mb-4 mt-4">Корзина</h2>
        <button on:click={() => closeModal('modal3')} class="text-4xl text-purple-400 hover:text-purple-600 transition duration-200">&times;</button>
    </div>

    {#if total == 0}
        <div class="flex flex-col items-center">
            <p>Упс! Ваша корзина пуста!</p>
            <p>Но это поправимо!</p>
        </div>
    {/if}

    <div class="flex flex-col h-full">
        {#each $cartItems as item(item.Id)}
            <div class="flex flex-col mb-4 border-b border-slate-300 pb-4">
                <div class="flex justify-end">
                    <button on:click={() => removeFromCart(item.Id)} class="text-2xl text-purple-400 hover:text-purple-600 transition duration-200">&times;</button>
                </div>

                <div class="flex justify-between items-center">
                    <img class="object-contain h-24 w-24 md:h-48 lg:h-auto" src="/static/{item.Images}" alt="{item.Name}">
                    <span class="ml-6 text-left text-sm leading-normal break-words md:max-w-md lg:max-w-lg">{item.Name}</span>
                </div>

                <div class="flex justify-between items-center mt-4">
                    <div class="flex items-center">
                        <button on:click={() => decreaseQuantity(item)} class="border border-gray-300 px-3 py-1 rounded-l bg-gray-100 hover:bg-gray-200">-</button>
                        <input class="w-12 text-center border-t border-b border-gray-300" type="text" value="{item.quantity}" disabled>
                        <button on:click={() => increaseQuantity(item)} class="border border-gray-300 px-2 py-1 rounded-r bg-gray-100 hover:bg-gray-200">+</button>
                    </div>
                    <span class="font-extrabold text-lg">{ item.Price * item.quantity }₴</span>
                </div>
            </div>
        {/each}

        {#if total > 0}
            <div class="flex flex-col bg-slate-100 p-4 mt-auto">
                <div class="flex justify-between font-extrabold text-lg mb-4">
                    <span>Итого:</span>
                    <span>{ total }₴</span>
                </div>
                <button on:click={ toCheckOut } class="bg-primary hover:bg-primary-dark text-white text-lg font-bold py-2 rounded w-full transition duration-200">Оформить заказ</button>
            </div>
        {/if}
    </div>
</div>

<style>
    .bg-primary {
        background-color: #34D399; /* Green-500 */
    }
    .hover\:bg-primary-dark:hover {
        background-color: #059669; /* Green-600 */
    }
</style>


