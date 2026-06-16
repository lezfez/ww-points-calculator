-- Fix: v_formulas was implicitly SECURITY DEFINER, bypassing RLS of the querying user.
CREATE OR REPLACE VIEW public.v_formulas
WITH (security_invoker = on)
AS
 SELECT s.label AS system,
    fc.nutrient,
    (
        CASE
            WHEN (fc.sign = 1) THEN '+'::text
            ELSE '-'::text
        END || (fc.coefficient)::text) AS koeffizient,
    fc.cap_value,
    fc.note
   FROM (formula_coefficients fc
     JOIN systems s ON ((s.id = fc.system_id)))
  ORDER BY s.sort_order, fc.sign DESC, fc.coefficient DESC;
