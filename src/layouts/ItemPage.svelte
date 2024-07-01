<script>
    import {onMount} from "svelte";
    import {host_address} from "../store.js";
    import Button from "../components/Button.svelte";
    import { addToCart } from "../cartStore.js";
    export let id;

    let item = {};
    let msg = "";

    function goBack() {

    if(window.history.length > 1) {
    window.history.back();
    }
    else {
    window.location.href = '/';
    }

}

    onMount(async () => {

        const response = await fetch($host_address + "/item/" + id, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();


        if (response.ok) {
            item = data;
        }
        else {
            msg = "Problem with data fetching!";
        }
    })

</script>




<section class="flex flex-col relative top-14 p-4 flex-wrap lg:w-1/2 lg:self-center">
    <div class="flex text-sm">
        <Button on:click={goBack} name="<" height="h-12" width="w-12" color="bg-primary" />
    </div>

    <div class="flex flex-col md:flex-col mt-4 ">
        <div class="flex flex-col h-2/4 border-t border-t-light border-b border-b-light pt-2 pb-6 md:grid
         md:grid-cols-2 md:gap-4 md:h-screen">
            <div class="flex flex-col mt-4 md:flex-row">
                <div class="">
                    <img class="sticky top-24 w-full h-auto" src="/static/{item.Images}" alt="{item.Name}">
                </div>
            </div>
            <div class="flex flex-col">
                <div class="flex mt-5">
                    <h1 class="text-xl font-bold mb-2 text-dark">{item.Name}</h1>
                </div>
                <div class="flex justify-between items-center border border-light rounded p-2 mt-4 md:h-36 md:flex-col
                 md:w-full">
                    <div class="flex flex-col md:flex-row md:justify-between md:w-full md:p-2 md:border-b
                     md:border-b-light">
                        {#if item.Discount > 0}{(item.Price / 100) * item.DiscountSize}{/if}
                        <span class="text-secondary text-l">
                            {#if item.IsStock}В наличии{/if}{#if !item.IsStock}Закончился{/if}</span>
                        <span class="font-bold text-dark">{item.Price}₴</span>
                    </div>
                    <Button on:click={() => addToCart(item)} icon="add_shopping_cart" width="w-1/2" name="" md="1"/>
                </div>
                <div class="flex flex-col justify-between items-center border border-light rounded p-2 mt-4
                 md:flex-col md:w-full">
                    <div class="flex flex-col md:justify-between w-full p-2 border-b border-b-light">
                        <h3 class="text-dark font-bold text-lg mb-4">Доставка</h3>
                    </div>
                    <ul class="flex flex-col list-disc mt-3 mb-3">
                        <li class="ml-8 mb-2">
                            <div class="flex justify-between">
                                <span class="font-bold">EMS</span>
                                <span>🚀</span>
                            </div>
                            <p class="mb-2">Срок: около 10 дней</p>
                            <p>Стоимость: $20 за первый кг, $10 за каждый следующий кг</p>
                        </li>
                        <li class="ml-8 mb-2">
                            <div class="flex justify-between">
                                <span class="font-bold">Морской транспорт</span>
                                <span>🚢</span>
                            </div>
                            <p class="mb-2">Срок: около 2 месяцев</p>
                            <p>Стоимость: $10 за первый кг, $5 за каждый следующий кг</p>
                        </li>
                        <li class="ml-8 mb-2">
                            <div class="flex justify-between">
                                <span class="font-bold">Авиапочта</span>
                                <span>✈️</span>
                            </div>
                            <p class="mb-2">Срок: 14-16 дней</p>
                            <p>Стоимость: $15 за кг</p>
                        </li>
                        <li class="ml-8 mb-2">
                            <div class="flex justify-between">
                                <span class="font-bold">Регион</span>
                                <span>🗾</span>
                            </div>
                            <p>Отправляем в США, Европу и Украину</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex flex-col">
                <h3 class="font-bold text-lg text-dark mt-4">Описание</h3>
                <div class="flex flex-col justify-center items-center hyphens-auto leading-normal break-words text-justify mb-4">
                    {@html item.Description}
                </div>
            </div>
            <div class="flex flex-col">
                <h3 class="font-bold text-lg text-dark mt-4">Способ применения</h3>
                <p class="flex hyphens-auto leading-normal break-words text-justify mb-4">
                    {item.HowTo}
                </p>
            </div>
            <div class="flex flex-col">
                <h3 class="font-bold text-lg text-dark mt-4">Состав</h3>
                <p class="leading-loose">
                    {item.Ingredients}
                </p>
            </div>
            <div class="flex flex-col">
                <h3 class="font-bold text-lg text-dark mt-4 mb-4">Характеристики</h3>
                <div class="grid gap-2 md:grid-cols-6">
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Производитель</div>
                        <div>{item.Brand}</div>
                    </div>
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Объем/количество</div>
                        <div>{item.Volume}</div>
                    </div>
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Форма выпуска</div>
                        <div>{item.Subsection}</div>
                    </div>
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Тип</div>
                        <div>{item.Type}</div>
                    </div>
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Страна</div>
                        <div>{item.Country}</div>
                    </div>
                    <div class="border p-2 bg-light">
                        <div class="font-bold">Назначение</div>
                        <div>{item.Use}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
