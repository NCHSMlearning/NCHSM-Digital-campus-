/* NCHSM mobile table scrolling — wrap tables in a dedicated horizontal scroller. */
(function(){
  'use strict';
  const SELECTOR='table';
  function wrapTable(table){
    if(!(table instanceof HTMLTableElement)||table.closest('.nchsm-table-scroll'))return;
    const parent=table.parentElement;
    if(!parent)return;
    const wrapper=document.createElement('div');
    wrapper.className='nchsm-table-scroll';
    wrapper.setAttribute('role','region');
    wrapper.setAttribute('aria-label','Scrollable table. Swipe left or right to see all columns.');
    wrapper.setAttribute('tabindex','0');
    parent.insertBefore(wrapper,table);
    wrapper.appendChild(table);
  }
  function scan(root){
    if(root.matches?.(SELECTOR))wrapTable(root);
    root.querySelectorAll?.(SELECTOR).forEach(wrapTable);
  }
  function start(){
    scan(document);
    if(window.MutationObserver){
      const observer=new MutationObserver(records=>{
        for(const record of records)record.addedNodes.forEach(node=>{
          if(node.nodeType===1)scan(node);
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
