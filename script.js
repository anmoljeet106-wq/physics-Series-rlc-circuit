const button = document.getElementById("calculate-btn");

button.addEventListener("click", function () {
    const R = Number(document.getElementById("resistance").value);
    const L = Number(document.getElementById("inductance").value);
    const C = Number(document.getElementById("capacitance").value);
    const V = Number(document.getElementById("voltage").value);
    const f = Number(document.getElementById("frequency").value);

    if (R <= 0 || L <= 0 || C <= 0 || V <= 0 || f <= 0) {
        alert("Please enter POSITIVE values for all parameters");
        return;
    }

    // 1. RLC Circuit Calculations
    const C_F = C * 1e-6;
    const omega = 2 * Math.PI * f;
    const XL = omega * L;
    const XC = 1 / (omega * C_F);
    const Z = Math.sqrt(R ** 2 + (XL - XC) ** 2);
    const I = V / Z;
    const phase = Math.atan((XL - XC) / R);
    const PF = R / Z;
    const P = V * I * PF;
    const fr = 1 / (2 * Math.PI * Math.sqrt(L * C_F));
    const Q = (2 * Math.PI * fr * L) / R;
    const phasedegrees = phase * (180 / Math.PI);

    const VR = I * R;
    const VL = I * XL;
    const VC = I * XC;

    // 2. Update Result Cards
    document.getElementById("impedence-result").textContent = Z.toFixed(2) + " Ω";
    document.getElementById("current-result").textContent = I.toFixed(3) + " A";
    document.getElementById("phase-result").textContent = phasedegrees.toFixed(2) + "°";
    document.getElementById("pf-result").textContent = PF.toFixed(3);
    document.getElementById("power-result").textContent = P.toFixed(2) + " W";
    document.getElementById("resonance-result").textContent = fr.toFixed(2) + " Hz";
    document.getElementById("q-result").textContent = Q.toFixed(2);

    // Update Resonance Status (if element exists in your HTML)
    const statusEl = document.getElementById("resonance-status");
    if (statusEl) {
        const difference = f - fr;
        if (Math.abs(difference) < 0.01) {
            statusEl.textContent = "At Resonance";
        } else if (difference < 0) {
            statusEl.textContent = "Below Resonance";
        } else {
            statusEl.textContent = "Above Resonance";
        }
    }

    // 3. Phasor Diagram Vectors & Auto-Scaling
    const vrVector = document.getElementById("vr-vector");
    const vlVector = document.getElementById("vl-vector");
    const vcVector = document.getElementById("vc-vector");
    const vVector = document.getElementById("v-vector");

    const vrLabel = document.getElementById("vr-label");
    const vlLabel = document.getElementById("vl-label");
    const vcLabel = document.getElementById("vc-label");
    const vLabel = document.getElementById("v-label");
    const phaseLabel = document.getElementById("phase-label");

    // Scale relative to the largest voltage so arrows stay inside the SVG bounds
    const maxVoltage = Math.max(V, VR, VL, VC);
    const scale = 125 / maxVoltage;
    const centerX = 300;
    const centerY = 175;

    const vrEndX = centerX + VR * scale;
    const vEndY = centerY + (VC - VL) * scale;

    vrVector.setAttribute("x2", vrEndX);

    vlVector.setAttribute("x1", vrEndX);
    vlVector.setAttribute("x2", vrEndX);
    vlVector.setAttribute("y1", centerY);
    vlVector.setAttribute("y2", centerY - VL * scale);

    vcVector.setAttribute("x1", vrEndX);
    vcVector.setAttribute("x2", vrEndX);
    vcVector.setAttribute("y1", centerY);
    vcVector.setAttribute("y2", centerY + VC * scale);

    vVector.setAttribute("x1", centerX);
    vVector.setAttribute("y1", centerY);
    vVector.setAttribute("x2", vrEndX);
    vVector.setAttribute("y2", vEndY);

    // 4. Smart Collision-Free Label Positioning
    const isCapacitive = VC > VL; // True when resultant V points downward

    // Keep VR on the opposite side of the dashed V vector
    vrLabel.setAttribute("x", centerX + (VR * scale) * 0.55);
    vrLabel.setAttribute("y", isCapacitive ? centerY - 14 : centerY + 24);
    vrLabel.setAttribute("text-anchor", "middle");

    // Keep V on the outer side of the dashed V vector
    vLabel.setAttribute("x", centerX + (VR * scale) * 0.55);
    vLabel.setAttribute("y", isCapacitive ? (centerY + vEndY) / 2 + 22 : (centerY + vEndY) / 2 - 14);
    vLabel.setAttribute("text-anchor", "middle");

    // Keep VL and VC cleanly to the right of the vertical arrows
    vlLabel.setAttribute("x", vrEndX + 16);
    vlLabel.setAttribute("y", centerY - Math.max((VL * scale) / 2, 14));
    vlLabel.setAttribute("text-anchor", "start");

    vcLabel.setAttribute("x", vrEndX + 16);
    vcLabel.setAttribute("y", centerY + Math.max((VC * scale) / 2, 18));
    vcLabel.setAttribute("text-anchor", "start");

    vrLabel.textContent = "VR = " + VR.toFixed(2) + " V";
    vlLabel.textContent = "VL = " + VL.toFixed(2) + " V";
    vcLabel.textContent = "VC = " + VC.toFixed(2) + " V";
    vLabel.textContent = "V = " + V.toFixed(2) + " V";

    // 5. Phase Angle Arc & Clean Left-Aligned Label
    const phaseArc = document.getElementById("phase-arc");
    const angle = -phase;
    const radius = 50;
    const endX = centerX + radius * Math.cos(angle);
    const endY = centerY + radius * Math.sin(angle);

    phaseArc.setAttribute(
        "d",
        `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 ${angle < 0 ? 0 : 1} ${endX} ${endY}`
    );

    phaseLabel.setAttribute("x", centerX - 14);
    phaseLabel.setAttribute("y", isCapacitive ? centerY + 24 : centerY - 12);
    phaseLabel.setAttribute("text-anchor", "end");
    phaseLabel.textContent = "φ = " + phasedegrees.toFixed(2) + "°";

    // 6. Current vs Frequency Chart (Chart.js)
    const placeholder = document.getElementById("graph-placeholder");
    if (placeholder) {
        placeholder.style.display = "none";
    }

    const canvas = document.getElementById("currentChart") || document.getElementById("resonance-chart");
    if (!canvas) {
        console.error("Chart canvas element not found.");
        return;
    }

    canvas.hidden = false;
    canvas.style.display = "block";

    const frequencies = [];
    const currents = [];
    const maxFreq = Math.max(fr * 2, f * 1.2);
    const step = Math.max(1, maxFreq / 200); // Smooth ~200-point curve regardless of frequency scale

    for (let frequency = 1; frequency <= maxFreq; frequency += step) {
        const inductive = 2 * Math.PI * frequency * L;
        const capacitive = 1 / (2 * Math.PI * frequency * C_F);
        const impedence = Math.sqrt(R ** 2 + (inductive - capacitive) ** 2);
        const current = V / impedence;

        frequencies.push(frequency);
        currents.push(current);
    }

    const ctx = canvas.getContext("2d");
    if (window.currentChart instanceof Chart) {
        window.currentChart.destroy();
    }

    window.currentChart = new Chart(ctx, {
        type: "line",
        data: {
            parsing: false,
            datasets: [
                {
                    label: "Circuit Current (A)",
                    data: frequencies.map((frequency, index) => ({
                        x: frequency,
                        y: currents[index]
                    })),
                    borderColor: "#8B7D68",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3
                },
                {
                    label: "Resonance (fr = " + fr.toFixed(2) + " Hz)",
                    data: [{ x: fr, y: V / R }], // Exact peak resonance point
                    borderColor: "#B87979",
                    backgroundColor: "#B87979",
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: "easeInOutQuart"
            },
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top"
                }
            },
            scales: {
                x: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Frequency (Hz)"
                    },
                    grid: {
                        color: "#E8E2D8"
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Current (A)"
                    },
                    grid: {
                        color: "#E8E2D8"
                    }
                }
            }
        }
    });
});
