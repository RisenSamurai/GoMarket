import { writable } from "svelte/store";

export const host_address = writable("http://192.168.91.193:3000");
export const isOpenStore = writable(false);

export function toggleSideBar() {

    isOpenStore.update(value => !value);
    
}
