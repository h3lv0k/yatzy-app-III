"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Database features will not work.');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || 'http://localhost:54321', supabaseKey || 'dummy-key', {
    auth: { persistSession: false },
});
//# sourceMappingURL=supabase.js.map