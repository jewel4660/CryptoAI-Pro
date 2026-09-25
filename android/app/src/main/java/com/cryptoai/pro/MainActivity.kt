package com.cryptoai.pro
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cryptoai.pro.data.ApiClient
import kotlinx.coroutines.launch

class MainActivity:ComponentActivity(){override fun onCreate(b:Bundle?){super.onCreate(b);setContent{App()}}}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun App(){
 var symbol by remember{mutableStateOf("BTCUSDT")}
 var price by remember{mutableStateOf<Double?>(null)}
 var signal by remember{mutableStateOf("—")}
 var score by remember{mutableStateOf("—")}
 var status by remember{mutableStateOf("Ready")}
 val scope=rememberCoroutineScope()
 MaterialTheme{
  Scaffold(topBar={TopAppBar(title={Text("CryptoAI Pro")})}){p->
   Column(Modifier.padding(p).padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
    Text("LIVE LONG / SHORT ENGINE",style=MaterialTheme.typography.headlineSmall)
    OutlinedTextField(symbol,{symbol=it.uppercase().replace("/","")},label={Text("Symbol")},modifier=Modifier.fillMaxWidth())
    Button(onClick={scope.launch{
      status="Loading live data..."
      try{
       val t=ApiClient.api.ticker(symbol).data
       val a=ApiClient.api.analysis(symbol).data
       price=t.last;signal=a.direction;score="LONG ${a.long_score} / SHORT ${a.short_score}"
       status="Live backend data"
      }catch(e:Exception){status="ERROR: ${e.message}"}
    }}){Text("Analyze")}
    Card(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)){
     Text("Price: ${price?:"—"}");Text("Signal: $signal");Text("Scores: $score");Text(status)
    }}
    Text("Exchange keys are not stored in this APK. Public market data is fetched by the backend.",style=MaterialTheme.typography.bodySmall)
   }
  }
 }
}
