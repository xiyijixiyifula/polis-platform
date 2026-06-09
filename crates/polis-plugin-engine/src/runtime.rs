use std::collections::HashMap;

use polis_core::error::AppError;
use polis_core::types::PluginPermission;
use tokio::sync::RwLock;
use uuid::Uuid;
use wasmtime::{Engine, Linker, Module, Store};

/// WASM 插件实例
pub struct PluginInstance {
    pub id: Uuid,
    pub space_id: Uuid,
    pub name: String,
    pub wasm_bytes: Vec<u8>,
    pub permissions: Vec<PluginPermission>,
    pub store: Store<PluginContext>,
}

/// 插件上下文 (运行时状态)
pub struct PluginContext {
    pub plugin_id: Uuid,
    pub space_id: Uuid,
    pub kv_store: HashMap<String, String>,
    pub log_buffer: Vec<String>,
}

impl PluginContext {
    pub fn new(plugin_id: Uuid, space_id: Uuid) -> Self {
        Self {
            plugin_id,
            space_id,
            kv_store: HashMap::new(),
            log_buffer: Vec::new(),
        }
    }
}

/// 插件管理器
pub struct PluginEngine {
    engine: Engine,
    instances: RwLock<HashMap<Uuid, PluginInstance>>,
}

impl PluginEngine {
    pub fn new() -> Result<Self, anyhow::Error> {
        let engine = Engine::default();
        Ok(Self {
            engine,
            instances: RwLock::new(HashMap::new()),
        })
    }

    /// 加载并实例化插件
    pub async fn load_plugin(
        &self,
        id: Uuid,
        space_id: Uuid,
        name: &str,
        wasm_bytes: &[u8],
        permissions: Vec<PluginPermission>,
    ) -> Result<(), AppError> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|e| AppError::internal(format!("Failed to compile WASM module: {}", e)))?;

        let mut linker: Linker<PluginContext> = Linker::new(&self.engine);

        // 注册宿主函数
        self.register_host_functions(&mut linker)?;

        let context = PluginContext::new(id, space_id);
        let mut store = Store::new(&self.engine, context);

        let _instance = linker
            .instantiate(&mut store, &module)
            .map_err(|e| AppError::internal(format!("Failed to instantiate plugin: {}", e)))?;

        let plugin = PluginInstance {
            id,
            space_id,
            name: name.to_string(),
            wasm_bytes: wasm_bytes.to_vec(),
            permissions,
            store,
        };

        self.instances.write().await.insert(id, plugin);
        tracing::info!("Plugin '{}' loaded successfully", name);

        Ok(())
    }

    /// 调用插件函数
    #[allow(unused_variables)]
    pub async fn call_function(
        &self,
        plugin_id: Uuid,
        function_name: &str,
        args: &[wasmtime::Val],
    ) -> Result<Vec<wasmtime::Val>, AppError> {
        // TODO(#plugin-fn-call): Implement proper function calling via wasmtime Instance
        // This requires storing the wasmtime::Instance alongside the Store in PluginState.
        // Steps to complete:
        // 1. Store `wasmtime::Instance` in the plugin state map (keyed by plugin_id)
        // 2. Retrieve the instance and call `instance.get_func(&mut store, function_name)`
        // 3. Convert wasmtime::Val args/results to/from the host-side types
        // 4. Handle WASM trap/error translation into AppError
        // Tracked in: docs/progress/MASTER.md — Plugin Engine milestone
        let _ = plugin_id;
        let _ = function_name;
        let _ = args;
        Err(AppError::internal("Function calling not yet fully implemented".to_string()))
    }

    /// 卸载插件
    pub async fn unload_plugin(&self, plugin_id: Uuid) -> Result<(), AppError> {
        self.instances
            .write()
            .await
            .remove(&plugin_id)
            .ok_or(AppError::not_found("Plugin not found".to_string()))?;
        tracing::info!("Plugin {} unloaded", plugin_id);
        Ok(())
    }

    /// 注册宿主函数 (host functions that plugins can call)
    fn register_host_functions(
        &self,
        _linker: &mut Linker<PluginContext>,
    ) -> Result<(), anyhow::Error> {
        // 注册 host_log 函数: 允许插件写日志
        // linker.func_wrap("env", "host_log", |ctx: &mut PluginContext, msg: &str| {
        //     ctx.log_buffer.push(msg.to_string());
        //     tracing::debug!("[Plugin {}] {}", ctx.plugin_id, msg);
        // })?;

        // // 注册 host_store_get: KV 存储读取
        // linker.func_wrap("env", "host_store_get", |ctx: &mut PluginContext, key: &str| -> String {
        //     ctx.kv_store.get(key).cloned().unwrap_or_default()
        // })?;

        // // 注册 host_store_set: KV 存储写入
        // linker.func_wrap("env", "host_store_set", |ctx: &mut PluginContext, key: &str, value: &str| {
        //     ctx.kv_store.insert(key.to_string(), value.to_string());
        // })?;

        Ok(())
    }

    /// 获取插件列表
    pub async fn list_plugins(&self) -> Vec<Uuid> {
        self.instances.read().await.keys().copied().collect()
    }
}
