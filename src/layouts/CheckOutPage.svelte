
<script>
    import Button from "../components/Button.svelte"; 
    import { cartItems } from "../cartStore";

    let total = 0;

    $: total = $cartItems.reduce((sum, item) => sum + item.Price * item.quantity, 0);

</script>

<section class="flex flex-col box-border w-screen relative z-50 bg-white p-4 lg:w-1/2 lg:self-center">
    <h2 class="font-bold text-lg mt-4 mb-2">Оформление Заказа</h2>

    <form action="check-out/submit" method="POST">
        <fieldset class="flex flex-col">
            <legend class="font-bold mb-4">Ваши контактные данные</legend>

            <div class="flex flex-col mb-2">
                <label for="lastName" class="text-xs text-zinc-400 mb-1">Фамилия</label>
                <input id="lastName" class="border border-slate-400 rounded-xl p-2" type="text" name="lastName" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="name" class="text-xs text-zinc-400 mb-1">Имя</label>
                <input id="name" class="border border-slate-400 rounded-xl p-2" type="text" name="name" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="middleName" class="text-xs text-zinc-400 mb-1">Отчество</label>
                <input id="middleName" class="border border-slate-400 rounded-xl p-2" type="text" name="middleName" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="phone" class="text-xs text-zinc-400 mb-1">Номер телефона</label>
                <input id="phone" class="border border-slate-400 rounded-xl p-2" type="tel" name="phone" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="email" class="text-xs text-zinc-400 mb-1">Электронная почта</label>
                <input id="email" class="border border-slate-400 rounded-xl p-2" type="email" name="email" required>
            </div>
        </fieldset>

        <fieldset class="flex flex-col mt-2">
            <legend class="font-bold mb-4">Данные для доставки</legend>

            <div class="flex flex-col mb-2">
                <label for="country" class="text-xs text-zinc-400 mb-1">Страна</label>
                <input id="country" class="border border-slate-400 rounded-xl p-2" type="text" name="country" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="region" class="text-xs text-zinc-400 mb-1">Область</label>
                <input id="region" class="border border-slate-400 rounded-xl p-2" type="text" name="region" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="city" class="text-xs text-zinc-400 mb-1">Город</label>
                <input id="city" class="border border-slate-400 rounded-xl p-2" type="text" name="city" required>
            </div>

            <div class="flex flex-col mb-2">
                <label for="postal" class="text-xs text-zinc-400 mb-1">Номер почтового отделения "Новая Почта"</label>
                <input id="postal" class="border border-slate-400 rounded-xl p-2" type="text" name="postal" required>
            </div>
        </fieldset>

        <fieldset class="flex flex-col mt-2 mb-4">
            <legend class="font-bold mb-4">Оплата</legend>

            <div class="flex mb-2 border border-slate-400 p-4 rounded-xl">
                <input id="pay" class="border border-slate-400 rounded-xl p-2" type="radio" name="pay" value="card" required>
                <label for="pay" class="flex justify-center items-center ml-2 text-sm">Перевод на карту</label>
            </div>
        </fieldset>

        <fieldset class="flex flex-col mt-2 mb-4">
            <legend class="font-bold mb-4">Товары</legend>

            {#each $cartItems as item(item.Id)}
            <div class="flex flex-col mb-4">

                <div class="flex justify-between lg:flex-col">
                    <div class="flex lg:self-start lg:mb-4">
                        <img  class="object-contain h-24 w-full md:h-96" src="/static/{item.Images}" alt="{item.Name}">
                    </div>
                    <span class=" flex justify-center items-center ml-6 text-left text-sm leading-normal break-words
                     md:max-w-md lg:max-w-lg lg:ml-0 lg:justify-start">{item.Name}</span>
                </div>
    
                
                 <div class="flex justify-between">
                    <div class="flex justify-center items-center">
                        <input class="flex self-center h-8 w-8 border text-center
                         border-slate-300 rounded-xl" type="number" value="{item.quantity}" disabled>
                    </div>
                    <span class="flex  font-extrabold text-lg justify-center items-center">
                        { item.Price * item.quantity}₴</span>
                 </div>  
                 
                    
            </div>
            
            {/each}

        <div class="flex flex-col bg-slate-100 p-4">
            <div class="flex w-full mb-4
             justify-between font-extrabold text-lg"><span>Итого:</span><span>{ total }₴</span>
            </div>
        </div>

            
        </fieldset>

        <Button name="Заказать" width="w-full" />
    </form>
</section>
