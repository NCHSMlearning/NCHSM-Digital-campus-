/* Keep wide data grids usable on touch screens without changing table markup or data. */
(function(){
 'use strict';
 const selector='.main table,.tab-content table,.dashboard-content table,.table-container table';
 function wrap(table){
  if(!table||table.closest('.table-responsive,.nchsm-table-scroll'))return;
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
