// White landing: click anywhere -> an orb with eyes appears, drifts to centre, washes cream, lands on /new/.
document.querySelectorAll('a[href^="../new"]').forEach((a) => a.addEventListener("click", () => { try { sessionStorage.setItem("bean-hello", "1"); } catch (e) {} }));

// Click: the orb (eyes) pops in, drifts to centre, the page washes to cream, then we land on /new/.
(() => {
  let going = false;
  const enter = (e) => {
    if (going) return; going = true;
    try { sessionStorage.setItem("bean-hello", "1"); } catch (err) {}
    const orb = document.createElement("div");
    orb.className = "orb-go";
    orb.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
    orb.innerHTML = '<i></i><i></i>';
    const wash = document.createElement("div"); wash.className = "wash";
    document.body.append(wash, orb);
    requestAnimationFrame(() => { orb.classList.add("in"); setTimeout(() => { orb.classList.add("centre"); wash.classList.add("on"); }, 520); });
    setTimeout(() => { location.href = "../new/"; }, 1500);
  };
  addEventListener("pointerdown", enter);
  addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") enter({ clientX: innerWidth / 2, clientY: innerHeight / 2 }); });
})();
