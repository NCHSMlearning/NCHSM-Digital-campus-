/* Keep wide data grids usable on touch screens without changing table markup or data. */
(function(){
 'use strict';
 const selector='.main table,.tab-content table,.dashboard-content table,.table-container table';
 // Respect existing component-level scroll regions. Wrapping these again creates
 // nested horizontal scrollbars and makes tables difficult to use on phones.
 const existingScrollRegions='.table-responsive,.nchsm-table-scroll,.cn-table-wrap,.table-container,.table-wrapper,.data-table-wrapper';
 function wrap(table){
  if(!table||table.closest(existingScrollRegions))return;
  const parent=table.parentElement;if(!parent)return;
  const shell=document.createElement('div');
  shell.className='nchsm-table-scroll';
  shell.setAttribute('role','region');
  shell.setAttribute('aria-label','Scrollable table');
  shell.setAttribute('tabindex','0');
  parent.insertBefore(shell,table);shell.appendChild(table);
 }
 function scan(root){
  if(root.matches&&root.matches('table'))wrap(root);
  if(root.querySelectorAll)root.querySelectorAll(selector).forEach(wrap);
 }
 function init(){
  scan(document);
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
   if(node.nodeType===1)scan(node);
  })));
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();