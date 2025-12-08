/**
 * Constants Module
 * Contains color palette and default configuration values
 */

export const COLOURS = [
    {h:"#FF7746",n:"Orange HF PETG"},{h:"#FFCE26",n:"Translucent Orange"},{h:"#FFFFFF",n:"White PETG"},
    {h:"#CC3F45",n:"Red PLA/PETG"},{h:"#A3A6AA",n:"HF Grey PETG"},{h:"#4FC359",n:"Alpine Green Sparkle"},
    {h:"#0AC789",n:"Basic Transparent PETG"},{h:"#56A4AD",n:"Dark Green PLA Matte"},{h:"#616364",n:"Matte Charcoal Grey PLA"},
    {h:"#3F9CCC",n:"Blue Silk PLA"},{h:"#BC9091",n:"Grey TPU/TPE"},{h:"#F0FEF3",n:"White TPU/TPE"},
    {h:"#6479B8",n:"Blue Grey PLA"},{h:"#F0D0DC",n:"Pink PETG CF"},{h:"#931010",n:"Dark Red TPU/TPE"},
    {h:"#4C484A",n:"Black PA6GF CF"},{h:"#966451",n:"Trim Grey Metallic PLA"},{h:"#FFE825",n:"Sunflower Yellow PLA"},
    {h:"#F4AFF3",n:"Merlot Plum PLA"},{h:"#6565F2",n:"Purple PLA"},{h:"#5A7BC0",n:"Metallic Cobalt Blue PLA"},
    {h:"#4F9756",n:"Neptune PLA Galaxy"},{h:"#76654F",n:"Grass Green PLA"},{h:"#FC9257",n:"Mandarin Orange PLA"},
    {h:"#EF9CA1",n:"Pink PLA"},{h:"#4C5752",n:"Purple Galaxy PLA"},{h:"#FF9399",n:"Light Grey CF PLA"},
    {h:"#4C9BF6",n:"Gold Metallic PLA"},{h:"#EEC4C1",n:"Pink Silk PLA"},{h:"#932DA1",n:"Marine Blue PLA"},
    {h:"#954D3F",n:"Marble Red PLA"},{h:"#B67254",n:"Bronze PLA"},{h:"#607745",n:"Olive Green PLA"},
    {h:"#3DCE59",n:"Alpine Green PLA"},{h:"#2E7799",n:"Medullosa Green PLA"},{h:"#B35C3F",n:"Crimson Red Sparkle PLA"},
    {h:"#BB7398",n:"Purple Grey PLA"},{h:"#A0B499",n:"Anti-Grey PLA"},{h:"#A7A344",n:"Chartreuse PLA"},
    {h:"#6D9553",n:"Green PLA"},{h:"#FECADE",n:"White Jade PLA"},{h:"#C13C40",n:"Red PLA"},
    {h:"#00B8DC",n:"Cyan PLA"},{h:"#C25498",n:"Magenta PLA"},{h:"#FED003",n:"Yellow PLA"},
    {h:"#09A4CE",n:"Sky Blue PLA"},{h:"#939393",n:"Grey PLA"},{h:"#444443",n:"Black PETG"},
    {h:"#60AF73",n:"Violet Purple PETG"},{h:"#2B8F98",n:"Teal PLA"},{h:"#BB7935",n:"Copper Silk PLA"},
    {h:"#EDCE1A",n:"Gold Silk PLA"},{h:"#F9D7E1",n:"Pale Pink PLA"},{h:"#D346A1",n:"Hot Pink PLA"},
    {h:"#787899",n:"Lilac Purple PLA"},{h:"#FCFB96",n:"Pale Yellow PLA"},{h:"#FFC968",n:"Golden Yellow PLA"},
    {h:"#B3CF3F",n:"Lime Green Metallic PLA"},{h:"#FDF192",n:"Lemon Yellow Silk PLA"},{h:"#D34651",n:"Scarlet Red Silk PLA"},
    {h:"#B09A5E",n:"Tan TPU/TPE"},{h:"#999564",n:"Olive Grey PLA"},{h:"#999939",n:"Dark Olive PLACF PLA"},
    {h:"#0DA553",n:"Forest Green PLA"},{h:"#B57B5E",n:"Bronze Silk PLA"},{h:"#09CD04",n:"Silver Metallic Silk PLA"},
    {h:"#0FD7E1",n:"Ice Blue PLA"},{h:"#9589BC",n:"Lavender Purple PLA"},{h:"#00A4CE",n:"Bright Cyan PLA"},
    {h:"#00A553",n:"Bambu Green PLA"},{h:"#404D3C",n:"Forest Black PLA"},{h:"#FF6B9D",n:"Hot Magenta PLA"},
    {h:"#8B4513",n:"Saddle Brown PLA"},{h:"#FFD700",n:"Gold PLA"}
];

// Default configuration values
export const DEFAULTS = {
    bedW: 256,
    bedH: 256,
    scanW: 210,  // A4 width
    scanH: 297,  // A4 height
    tileSize: 10,
    gap: 1,
    layers: 4,
    layerH: 0.08,
    baseLayers: 3,
    printW: 170,
    maxColours: 4,
    minDetail: 1.0
};
